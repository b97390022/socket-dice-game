from flask import Flask, request, abort, render_template, jsonify
from flask_socketio import SocketIO, emit, send
from datetime import datetime
import locale
import random
import uuid

locale.setlocale(locale.LC_TIME, 'zh_TW')

app = Flask(__name__)
app.config['SECRET_KEY'] = 'xB1cnh6WzmZYrUcCv62A4A'
socketio = SocketIO(app)

class PlayControl:
    def __init__(self, playercount, readycount, users, messages):
        self.playercount = playercount
        self.readycount = readycount
        self.users = users
        self.messages = messages

    def update_player_count(self, data):
        self.playercount += data
        socketio.emit('updatePlayerCount', self.playercount, namespace='/chat')

    def update_ready_count(self, data):
        self.readycount += data
        if data > 0:
            self.users[request.sid]['ready'] = True
        else:
            self.users[request.sid]['ready'] = False
        socketio.emit('updateReadyCount', self.readycount, namespace='/chat')

    def save_messages(self, message):
        self.messages.append(message)      

    def get_ready_users(self):
        return [
            i for i in self.users.values() if (i['ready'] == True and i['inGame'] == False)
        ]

    def get_ready_players(self):
        return {
            k: v
            for k, v in self.users.items()
            if (v['ready'] == True and v['inGame'] == False)
        }

    def get_player(self, id):
        return self.users[id]

    def find_other_players(self, id, group_id):
        players = []
        for _, user in self.users.items():
            if group_id == user.get('group_id') and id != user.get('id'):
               players.append(user)
        return players

    def reset_status_of_player(self, player):
        user = self.users[player['id']]
        user["group_id"] = ""
        user["ready"] = False
        user["onTurn"] = False
        user["inGame"] = False
        user["score"] = 0

    def change_status_of_other_players(self, players):
        for player in players:
            user = self.users[player['id']]
            user["group_id"] = ""
            user["ready"] = False
            user["onTurn"] = False
            user["inGame"] = False
            user["score"] = 0

    def random_players(self, users):
        return random.choice(list(users.keys()))
    
    def set_inGame(self, users):
        master_sid = self.random_players(users)
        group_id = uuid.uuid4().hex
        # set users inGame and onTurn and Group them.
        for sid, user in users.items():
            if sid == master_sid:
                user['onTurn'] = True
            user['inGame'] = True
            user['group_id'] = group_id
        return master_sid

    def start_game(self):
        users = self.get_ready_players()
        master_sid = self.set_inGame(users)
        return master_sid, users

control = PlayControl(0, 0, {}, [])

@app.route("/")
def home():
    return render_template('index.html', async_mode=socketio.async_mode)

@app.route("/checkUser/<username>", methods=('GET',))
def check_user(username):
    result = username in [i['username'] for i in control.users.values()]
    return {
        'username': username,
        'result': '1' if result else '0'
    }

@socketio.on('send', namespace='/chat')
def chat(data):
    control.save_messages(data)
    socketio.emit('newMessage', data, namespace='/chat')

@socketio.on('setUsername', namespace='/chat')
def set_username(data):

    message = data['message']
    welcome_message = f'歡迎 {message} 加入聊天室!'
    date = data['date']

    control.users[request.sid]["username"] = message
    socketio.emit('initChatMessages', control.messages, namespace='/chat', room=request.sid)
    control.save_messages({'message': welcome_message, 'user': message, 'date': date, 'color': "#ff0000"})
    socketio.emit('userSet', {"username": message}, namespace='/chat', room=request.sid)
    socketio.emit('broadcast', {"username": '系統公告', "message": welcome_message, 'date': date, 'color': "#ff0000"}, namespace='/chat')
        
@socketio.on('connect', namespace='/chat')
def connect():
    control.update_player_count(1)
    print(f'user {request.sid} connected.')
    control.users[request.sid] = {"id": request.sid, "username": "", "ready": False, "onTurn": False, "inGame": False, "score": 0, "group_id": ""}
    
    socketio.emit('updateReadyCount', control.readycount, namespace='/chat')

@socketio.on('disconnect', namespace='/chat')
def disconnect():
    print(f'user {request.sid} disconnected.')
    control.update_player_count(-1)
    user = control.users[request.sid]

    if user['inGame']:
        sid = request.sid
        group_id = control.users[sid]['group_id']
        other_players = control.find_other_players(sid, group_id)
        control.change_status_of_other_players(other_players)

        for player in other_players:
            emit('stopGame', control.users[sid]['username'], namespace='/chat', room=player['id'])

    if user['ready']:
        control.update_ready_count(-1)
        socketio.emit('updatePlayerList', {'data': 1, 'user': control.get_ready_users(), 'action': 'refresh'}, namespace='/chat')

    dt = datetime.now()
    date = f'{dt:%Y}年{int(dt.month)}月{int(dt.day)}日 {dt:%p}{int(dt.hour)}:{dt.minute}'
    goodbye_message = f'{control.users[request.sid].get("username")} 離開了!'
    control.save_messages({'message': goodbye_message, 'user': control.users[request.sid].get("username"), 'date': date, 'color': "#ff0000" })
    socketio.emit('broadcast', {"username": '系統公告', "message": goodbye_message, 'date': date, 'color': "#ff0000"}, namespace='/chat')
    control.users.pop(request.sid)

@socketio.on('quitGame', namespace='/chat')
def quitGame(data):
    print(f'user {request.sid} quit game.')
    sid = request.sid
    control.update_ready_count(-1)
    group_id = control.users[sid]['group_id']
    other_players = control.find_other_players(sid, group_id)
    control.change_status_of_other_players(other_players)
    
    for player in other_players:
        emit('stopGame', control.users[sid]['username'], namespace='/chat', room=player['id'])
    
    player = control.get_player(sid)
    control.reset_status_of_player(player)

@socketio.on('resetStatus', namespace='/chat')
def resetStatus(data):
    print(f'user {request.sid} reset status.')
    sid = request.sid
    control.update_ready_count(-1)
    player = control.get_player(sid)
    control.reset_status_of_player(player)

@socketio.on('updateReadyCount', namespace='/chat')
def updateReadyCount(data):
    control.update_ready_count(data['data'])
    socketio.emit('updatePlayerList', {'data': 1, 'user': control.get_ready_users(), 'action': 'refresh'}, namespace='/chat')

@socketio.on('startGame', namespace='/chat')
def startGame(data):
    sid = request.sid
    master_sid, users = control.start_game()
    for user in users.values():
        emit(
            'startGame', 
            {
                "master_sid": master_sid,
                "sid": sid,
                "users": users,
                "diceNumber": data['diceNumber'],
                "winPoint": data['winPoint'],
            },
            namespace='/chat',
            room=user['id']
        )
    socketio.emit('updatePlayerList', {'data': 1, 'user': control.get_ready_users(), 'action': 'refresh'}, namespace='/chat', skip_sid=[users.keys()])

@socketio.on('skipToOthers', namespace='/chat')
def skipToOthers(data):
    user = data['user']
    sp = data['sp']
    id = request.sid
    group_id = control.users[request.sid]['group_id']

    control.users[id]['onTurn'] = False
    control.users[sp['id']]['onTurn'] = True

    other_players = control.find_other_players(id=id, group_id=group_id)

    for player in other_players:
        emit(
            'skipToOthers',{
                "id": request.sid,
                "user":user,
                "switchTo": sp['id'],
            },
            namespace='/chat',
            room = player['id']
        )

@socketio.on('updatePlayStatus', namespace='/chat')
def updatePlayStatus(data):
    dices = data['numbers']
    score = data['score']
    user = data['user']
    sp = data['sp']
    win = data['win']
    id = request.sid
    group_id = control.users[request.sid]['group_id']
    
    if sp['status']:
        control.users[id]['onTurn'] = False
        control.users[sp['id']]['onTurn'] = True

    other_players = control.find_other_players(id=id, group_id=group_id)
   
    for player in other_players:
        emit(
            'updatePlayStatus',{
                "dices": dices,
                "id": request.sid,
                "score": score,
                "user":user,
                "switchTo": sp['id'],
                'win': win
            },
            namespace='/chat',
            room = player['id']
        )

if __name__ == "__main__":

    socketio.run(app, debug=True, host="0.0.0.0")
