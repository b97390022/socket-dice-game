let ready = false;
let user;
let id;
let controller;
const chatroom = document.getElementsByClassName("msger-chat");

const dicePictures = [
	"static/images/1die.jpg",
	"static/images/2die.jpg",
	"static/images/3die.jpg",
	"static/images/4die.jpg",
	"static/images/5die.jpg",
	"static/images/6die.jpg"
];

function isPositiveInteger(s){
	const re = /^[0-9]+$/ ;
	return re.test(s)
}

function isInDiceRange(s){
	const re = /^[1-6]$/ ;
	return re.test(s)
}

function quitGameHandler() {
	const game = document.querySelector('#game');
	const actions = document.querySelector('#actions');
	const score = document.querySelector('#score');

	socket.emit('quitGame', '');
	//reset dom
	const wrapper = document.querySelector('.startWrapper > div:nth-child(1)');
	while (wrapper.firstChild) {
		wrapper.removeChild(wrapper.firstChild);
	};
	const h2 = document.createElement('h2');
	h2.textContent = 'Start a Game';
	wrapper.appendChild(h2);
	let input = document.createElement('input');
	input.type = 'text';
	input.id = 'diceNumber';
	input.placeholder = '請輸入骰子數量';
	wrapper.appendChild(input);
	input = document.createElement('input');
	input.type = 'text';
	input.id = 'winPoint';
	input.placeholder = '請輸入獲勝點數';
	wrapper.appendChild(input);
	const btn = document.createElement('button');
	btn.id='getReady';
	btn.textContent='準備開始!';
	addEvtListenerOfReadyBtn(btn);
	wrapper.appendChild(btn);

	document.querySelector('#quit').remove();

	const startBtn = document.createElement('button');
	startBtn.id = "startgame";
	startBtn.textContent = "隨機挑選初始玩家，並開始進行遊戲。";
	addEvtListenerOfStartBtn(startBtn);
	document.querySelector('#gamecontrol').appendChild(startBtn);

	game.innerHTML = "";
	actions.innerHTML = "";
	score.innerHTML = "";

	ready = false;
};

function restartGameHandler() {
	const game = document.querySelector('#game');
	const actions = document.querySelector('#actions');
	const score = document.querySelector('#score');

	socket.emit('resetStatus', '');
	//reset dom
	const wrapper = document.querySelector('.startWrapper > div:nth-child(1)');
	while (wrapper.firstChild) {
		wrapper.removeChild(wrapper.firstChild);
	};
	const h2 = document.createElement('h2');
	h2.textContent = 'Start a Game';
	wrapper.appendChild(h2);
	let input = document.createElement('input');
	input.type = 'text';
	input.id = 'diceNumber';
	input.placeholder = '請輸入骰子數量';
	wrapper.appendChild(input);
	input = document.createElement('input');
	input.type = 'text';
	input.id = 'winPoint';
	input.placeholder = '請輸入獲勝點數';
	wrapper.appendChild(input);
	const btn = document.createElement('button');
	btn.id='getReady';
	btn.textContent='準備開始!';
	addEvtListenerOfReadyBtn(btn);
	wrapper.appendChild(btn);

	document.querySelector('#quit').remove();

	const startBtn = document.createElement('button');
	startBtn.id = "startgame";
	startBtn.textContent = "隨機挑選初始玩家，並開始進行遊戲。";
	addEvtListenerOfStartBtn(startBtn);
	document.querySelector('#gamecontrol').appendChild(startBtn);

	game.innerHTML = "";
	actions.innerHTML = "";
	score.innerHTML = "";

	ready = false;
};	

class diceRoller {
	#randomAlgorithm = {
		randomInt: function getRandomIntInclusive(min, max) {
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
		},
	};
	#diceNumber;
	#randomMethod;
	#min;
	#max;

	constructor(diceNumber, method, min, max) {
		this.#diceNumber = diceNumber;
		this.#randomMethod = this.#randomAlgorithm[method];
		this.#min = min;
		this.#max = max;
	}

	rollingDices() {
		let results = [];
		for (let index = 0; index < this.#diceNumber; index++) {
			results.push(this.#randomMethod(this.#min, this.#max));
		}
		return results;
	}
};

class gameController {
	#diceRoller;
	#data = {};
	#size;
	#nowPlayer;
	#winPoint;

	get size () {
		return this.#size;
	};
	get nowPlayer () {
		return this.#nowPlayer;
	};
	get winPoint () {
		return this.#winPoint;
	};
	get data () {
		return this.#data;
	};
	constructor(rollerArg, players, winPoint) {

		this.#diceRoller = new diceRoller(
			rollerArg['diceNumber'],
			rollerArg['randomMethod'],
			rollerArg['randomMin'],
			rollerArg['randomMax']
		);
		this.#initData(players);
		this.#nowPlayer = this.#findOnTurn(this.#data);
		this.#winPoint = winPoint;
	};

	static #uuid() {
		let d = Date.now();
		if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
			d += performance.now(); //use high-precision timer if available
		}
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			let r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
		});
	}
	
	#initData (players) {

		Object.entries(players).forEach(([key, value]) => {

			this.#data[key] = {
				id: key,
				name: value.username,
				ready: value.ready,
				onTurn: value.onTurn,
				inGame: value.inGame,
				score: 0
			};
		});

		this.#size = Object.keys(this.#data).length;
	};

	roll() {
		return this.#diceRoller.rollingDices();
	};

	makeDiceImg(numbers){
		for (let index = 0; index < numbers.length; index++) {
			let img = document.createElement("img");
			img.src = dicePictures[numbers[index]-1];
			game.appendChild(img);
		}
	};

	removeDiceImgs(){
		let images = document.querySelectorAll('#game > img');
		for (let index = 0; index < images.length; index++) {
			game.removeChild(images[index]);
		};
	};

	makeNotice(text){
		const p = document.createElement("p");
		const textNode = document.createTextNode(text);
		p.appendChild(textNode);
		game.appendChild(p);
	};

	#findOnTurn(data) {

		for (const key in data) {
			if (Object.hasOwnProperty.call(data, key)) {
				const element = data[key];
				if (element.onTurn == true) {
					return element;
				};
			};
		}
	};

	#randomPlayer() {
		const keys = Object.keys(this.#data);
  		return keys[Math.floor(Math.random() * keys.length)];
	};

	switchPlayer() {
		this.#nowPlayer.onTurn = false;
		let sid;
		do {
			sid = this.#randomPlayer();
		} while (sid == this.#nowPlayer.id);
		this.#nowPlayer = this.#data[sid];
		this.#nowPlayer.onTurn = true;
	};
	switchTurn (oldID, newID) {
		this.#data[oldID].onTurn = false;
		this.#data[newID].onTurn = true;
		this.#nowPlayer = this.#data[newID]
	};
	getScore(id) {
		return this.#data[id].score;
	};

	setScore(id, score) {
		this.#data[id].score = score;
	};

	updateScore() {
		score.innerHTML = '';
		for (let key in this.#data) {
			score.innerHTML += `
				<p>The score is currently <strong>${this.#data[key].name}: ${this.#data[key].score}</strong></p>
			`;
		};
	};

	winning(name, score) {
		actions.innerHTML = '';
		document.querySelector('#quit').textContent = "Start a New Game?";
		document.querySelector('#quit').removeEventListener('click', quitGameHandler);
		document.querySelector('#quit').addEventListener('click', restartGameHandler);
		document.querySelector('#score').innerHTML = `<h2>${name} wins with ${score} points!</h2>`;
	};

	resetStatus(sid) {
		this.#data[sid] = {
			id: sid,
			ready: false,
			onTurn: false,
			inGame: false,
			score: 0
		};
	}
};

const socket = io(
	"ws://localhost:5000/chat", {
		auth: {
			token: 'xB1cnh6WzmZYrUcCv62A4A'
		}
	}
);

socket.on("connect", () => {
  id = socket.id;
});

socket.on('updatePlayerCount', function(data) {
	document.querySelector('#playerCount > span:nth-child(1) > span').textContent = data;
});
socket.on('updateReadyCount', function(data) {
	document.querySelector('#playerCount > span:nth-child(2) > span').textContent = data;
});

function addEvtListenerOfReadyBtn(readyBtn) {
	readyBtn.addEventListener('click', function () {
		if (!user) {
			alert('請先取一個名字!');
			return;
		};

		if (ready === false) {
			ready = true;
			socket.emit('updateReadyCount', {data: 1, user: user, action: 'add'});
			readyBtn.textContent = "準備好了!";
		} else if (ready === true){
			ready = false;
			socket.emit('updateReadyCount', {data: -1, user: user, action: 'sub'});
			readyBtn.textContent = "準備開始!";
		};
	});
};

function addEvtListenerOfStartBtn(starBtn) {
	
	starBtn.addEventListener('click', function () {

		let playerCount = document.querySelector('#playerCount > span:nth-child(1) > span').textContent;
		let readyCount = document.querySelector('#playerCount > span:nth-child(2) > span').textContent;

		if (playerCount == 1) {
			alert("一個人不能開始玩遊戲!");
			return;
		};

		if (playerCount != readyCount) {
			alert("有玩家尚未準備完成!");
			return;
		};

		let diceNumber = document.querySelector('#diceNumber').value;
		let winPoint = document.querySelector('#winPoint').value;

		if (!isInDiceRange(diceNumber) || !isPositiveInteger(winPoint)) {
			alert(`骰子數量判斷: ${isInDiceRange(diceNumber)}, 獲勝點數判斷: ${isPositiveInteger(winPoint)}`)
			return;
		};
		
		socket.emit('startGame', {
			user: user,
			diceNumber: diceNumber,
			winPoint: winPoint
		});
	});
};

window.addEventListener('load', function () {
	"use strict";
	const msger = document.querySelector('.msger');
	const gameControl = document.querySelector('#gamecontrol');
	const game = document.querySelector('#game');
	const actions = document.querySelector('#actions');
	const score = document.querySelector('#score');
	let color;

	$(msger).hide();
	$(gameControl).hide();
	$(game).hide();
	$(actions).hide();
	$(score).hide();

	const getReadyBtn = document.querySelector('#getReady');
	const startBtn = document.querySelector('#startgame');
	addEvtListenerOfReadyBtn(getReadyBtn);
	addEvtListenerOfStartBtn(startBtn);

	document.getElementById('startChatBtn').addEventListener('click', setUsername);
	document.getElementById('chatName').addEventListener('keypress', function (event) {
		const key=event.key;

		if (key=='Enter'){
			setUsername();
		};
	});

	function getRandomColor() {
		return `#${Math.floor(Math.random()*16777215).toString(16)}`
	};

	function setUsername() {
		let username = document.getElementById('chatName').value;
		if (username === '') {
			alert('使用者名稱不可以空白!');
			return;
		};

		fetch(`/checkUser/${username}`, {
			method: 'GET',
		}).then(res => res.json())
		.then((response) => {
			if (response.result == '1') {
				alert(`玩家名稱: ${response.username} 已經存在! 請換一個玩家名稱!`);
				return;
			};

			socket.emit('setUsername', {
				message: document.getElementById('chatName').value,
				user: user,
				date: new Date().toLocaleDateString("zh-Hans-TW", {
					day: 'numeric',    //(e.g., 1)
					month: 'short',    //(e.g., Oct)
					year: 'numeric',   //(e.g., 2019)
					hour: '2-digit',   //(e.g., 02)
					minute: '2-digit', //(e.g., 02)          
					hour12: true,     // 12 小時制
					timeZone: 'Asia/Taipei'
				}),
			});
			document.getElementById('chatName').classList.add('hide');
			document.getElementById('startChatBtn').classList.add('hide');
			document.getElementById('startChatBtn').removeEventListener("click", setUsername);

			$(msger).show("slow");
			$(gameControl).show("slow");
			$(game).show("slow");
			$(actions).show("slow");
			$(score).show("slow");
				
		})
		.catch(error => console.error('Error:', error));
	};
	
	function makeChatRoom(data) {
		document.getElementById('send').addEventListener('click', sendMessage);
		document.getElementById('msg').addEventListener('keypress', function (event) {
			const key=event.key;

			if (key=='Enter'){
				sendMessage();
			};
		});
	};
	
	function sendMessage() {
		const msgInput = document.getElementById('msg');
		if(msgInput.value) {
			socket.emit('send', {
				message: msgInput.value,
				user: user,
				date: new Date().toLocaleDateString("zh-Hans-TW", {
					day: 'numeric',    //(e.g., 1)
					month: 'short',    //(e.g., Oct)
					year: 'numeric',   //(e.g., 2019)
					hour: '2-digit',   //(e.g., 02)
					minute: '2-digit', //(e.g., 02)          
					hour12: true,     // 12 小時制
					timeZone: 'Asia/Taipei'
				}),
				color: color
			});
		};
		msgInput.value = "";
	};

	socket.on('userExists', function(data) {
		alert(data);
	});

	socket.on('userSet', function(data) {
		user = data.username;
		color = getRandomColor();
		makeChatRoom(data);
	});

	function getMessage(user, message, date, color) {
		
		const msg = `
			<div class="msg-bubble">
				<div class="msg-info">
					<div class="msg-info-name"><b style="color: ${color};">${user}</b></div>
					<div class="msg-info-time">${date}</div>
				</div>
			<div class="msg-text">${message}</div>
		</div>`
		
		return msg;
	}

	function broadcastMessage(user, message, date, color) {
		const msg = `
			<div class="msg-bubble">
				<div class="msg-info">
					<div class="msg-info-name"><b style="color: ${color};">${user}</b></div>
					<div class="msg-info-time">${date}</div>
				</div>
			<div class="msg-text">${message}</div>
		</div>`
		
		return msg;
	}

	function insertMsg(msg, domObj) {
		domObj.insertAdjacentHTML("beforeend", msg);
		domObj.scrollTop += 500;
	};

	socket.on('newMessage', function(data) {
		if(user) {
			let msg = getMessage(data.user, data.message, data.date, data.color);
			insertMsg(msg, chatroom[0]);
		};
	});

	socket.on('broadcast', function(data) {
		if(user) {
			let msg = broadcastMessage(data.username, data.message, data.date, data.color);
			insertMsg(msg, chatroom[0]);
		};
	});

	socket.on('initChatMessages', function(data) {

		for (let index = 0; index < data.length; index++) {
			const element = data[index];
			let msg = getMessage(element.user, element.message, element.date, element.color);
			insertMsg(msg, chatroom[0]);
		};
	});

	socket.on('updatePlayerList', function(data) {

		const usersWaitingList = Array.from(document.querySelectorAll('#gamecontrol > section > span'));
		let arr = [];
		for (const user of usersWaitingList) {
			arr.push(user.textContent);
		};
		let action = data.action;

		if (action  == 'refresh') {
			usersWaitingList.forEach(el => {
				el.remove();
			});
			// refrehing users
			data.user.forEach(element => {
				let span = document.createElement('span');
				span.textContent = element.username;
				document.querySelector('#gamecontrol > section').appendChild(span);
			});
		};
	});

	socket.on('stopGame', function(playerName) {
		alert(`${playerName} 中離了!遊戲玩不下去啦~`);
		const wrapper = document.querySelector('.startWrapper > div:nth-child(1)');
		while (wrapper.firstChild) {
			wrapper.removeChild(wrapper.firstChild);
		};
		const h2 = document.createElement('h2');
		h2.textContent = 'Start a Game';
		wrapper.appendChild(h2);
		let input = document.createElement('input');
		input.type = 'text';
		input.id = 'diceNumber';
		input.placeholder = '請輸入骰子數量';
		wrapper.appendChild(input);
		input = document.createElement('input');
		input.type = 'text';
		input.id = 'winPoint';
		input.placeholder = '請輸入獲勝點數';
		wrapper.appendChild(input);
		const btn = document.createElement('button');
		btn.id='getReady';
		btn.textContent='準備開始!';
		addEvtListenerOfReadyBtn(btn);
		wrapper.appendChild(btn);

		socket.emit('updateReadyCount', {data: -1, user: user, action: 'sub'});
		document.querySelector('#quit').remove();

		const startBtn = document.createElement('button');
		startBtn.id = "startgame";
		startBtn.textContent = "隨機挑選初始玩家，並開始進行遊戲。";
		addEvtListenerOfStartBtn(startBtn);
		document.querySelector('#gamecontrol').appendChild(startBtn);

		game.innerHTML = "";
		actions.innerHTML = "";
		score.innerHTML = "";

		ready = false;
	});

	socket.on('startGame', function(data) {
		//someone start the game
		let master_sid = data.master_sid
		let sid = data.sid
		let players = data.users;
		let diceNumber = data.diceNumber;
		let winPoint = data.winPoint;

		controller = new gameController(
			{
				diceNumber: diceNumber,
				randomMethod: "randomInt",
				randomMin: 1,
				randomMax: 6
			},
			players,
			winPoint,
		);

		if (!controller) {
			alert('controller init error!');
			return;
		};

		//remove ready button
		document.querySelector('#getReady').remove();
		//remove start button
		document.querySelector('#startgame').remove();
		//remove waiting list
		for (const element of document.querySelectorAll('#gamecontrol > section > span')) {
			element.remove();
		};
		//update winPoint and dice number
		document.querySelector('#diceNumber').remove();
		document.querySelector('#winPoint').remove();

		let nowPlayer = controller.nowPlayer.name;
		document.querySelector('#gamecontrol h2').textContent = "The Game Has Started";

		const span = document.createElement('span');
		span.textContent = `骰子數量: ${diceNumber}, 獲勝點數: ${winPoint}`;
		document.querySelector('#gamecontrol h2').appendChild(span);
		const btn = document.createElement('button');
		btn.setAttribute('id', 'quit');
		const textNode = document.createTextNode("Wanna Quit?");
		btn.appendChild(textNode);
		gameControl.appendChild(btn);

		//類似中離的行為
		document.querySelector('#quit').removeEventListener('click', restartGameHandler);
		document.querySelector('#quit').addEventListener('click', quitGameHandler);

		game.innerHTML = `<p>Roll the dice for the player: ${nowPlayer}</p>`;
		
		if (socket.id == controller.nowPlayer.id) {
			actions.innerHTML = `<button id="roll">Roll the Dice</button>`;
			document.querySelector('#roll').addEventListener('click', newTurn);
		} else {
			actions.innerHTML = `<button id="roll">Not your turn</button>`;
			document.querySelector('#roll').addEventListener('click', notYourTurn);
		}

		Object.entries(players).forEach(([key, value]) => {
			score.innerHTML += `
				<p>The score is currently <strong>${value.username}: ${value.score}</strong></p>
			`;
		});
	});

	function newTurn() {
		//my Turn
		let numbers = controller.roll();

		controller.removeDiceImgs();
		controller.makeDiceImg(numbers);

		let count = numbers.filter(x => x==1).length;
		let score =  controller.getScore(controller.nowPlayer.id) + numbers.reduce( (prev, curr) => prev + curr );
		let sp = {id: '', status: false};
		let win = false;

		if (score >= controller.winPoint) {
			controller.setScore(controller.nowPlayer.id, score);
			controller.winning(controller.nowPlayer.name, score);
			win = true;
		};

		if (win == false) {
			if (count === 0) {
				/********* no one rolls *********/
				controller.setScore(controller.nowPlayer.id, score);
				controller.updateScore();

				actions.innerHTML = `<button id="rollagain">Roll again</button> or <button id="pass">Pass</button>`;
				document.querySelector('#rollagain').addEventListener('click', newTurn);
				
				//類似骰到1
				document.querySelector('#pass').addEventListener('click', ()=>{
					actions.innerHTML = "";
					controller.switchPlayer();
					sp.status = true;
					sp.id = controller.nowPlayer.id;	
					controller.makeNotice(`我暫時pass給~ ${controller.nowPlayer.name}`);

					//刪除掉我骰的一些功能
					setTimeout(function () {
						game.innerHTML = `<p>Roll the dice for the player: ${controller.nowPlayer.name}</p>`;
						actions.innerHTML = `<button id="roll">Not your turn</button>`;
						document.querySelector('#roll').addEventListener('click', notYourTurn);
					}, 2000);

					//update the play status
					socket.emit('skipToOthers', {
						user: user,
						sp: sp
					});
				});

			} else if (count === numbers.length) {
				/********* full of 1 *********/
				score = 0;
				controller.setScore(controller.nowPlayer.id, score);
				controller.updateScore();

				actions.innerHTML = "";
				controller.switchPlayer();
				sp.status = true;
				sp.id = controller.nowPlayer.id;			
				controller.makeNotice(`阿哈哈! 你的運氣真不好，骰到兩個1`);
				setTimeout(function () {
					game.innerHTML = `<p>Roll the dice for the player: ${controller.nowPlayer.name}</p>`;
					actions.innerHTML = `<button id="roll">Not your turn</button>`;
					document.querySelector('#roll').addEventListener('click', notYourTurn);
				}, 2000);
			} else if (count >= 1) {
				/********* 1's count >=1 but no more than full *********/
				controller.setScore(controller.nowPlayer.id, score);
				controller.updateScore();
				actions.innerHTML = "";
				controller.switchPlayer();
				sp.status = true;
				sp.id = controller.nowPlayer.id;
				controller.makeNotice(`哇! 很不幸的你有骰子骰到1了，只好換下一個囉~ ${controller.nowPlayer.name}`);
				
				//刪除掉我骰的一些功能
				setTimeout(function () {
					game.innerHTML = `<p>Roll the dice for the player: ${controller.nowPlayer.name}</p>`;
					actions.innerHTML = `<button id="roll">Not your turn</button>`;
					document.querySelector('#roll').addEventListener('click', notYourTurn);
				}, 2000);
			};
		};
		//update the play status
		socket.emit('updatePlayStatus', {
			numbers: numbers,
			score: score,
			user: user,
			sp: sp,
			win: win
		});
	};

	function notYourTurn() {
		alert('還沒輪到你哦!')
	};

	socket.on('skipToOthers', function(data) {
		//Somone skip turns
		controller.removeDiceImgs();
		controller.switchTurn(data.id, data.switchTo);
		if (socket.id == controller.nowPlayer.id) {
			controller.makeNotice(`哇! ${controller.data[data.id].name} 把機會讓給你，讚!`);
			setTimeout(function () {
				game.innerHTML = `<p>Roll the dice for the player: ${controller.nowPlayer.name}</p>`;
				actions.innerHTML = `<button id="roll">Roll the Dice</button>`;
				document.querySelector('#roll').addEventListener('click', newTurn);
			}, 2000);
		} else {
			controller.makeNotice(`雖然 ${controller.data[data.id].name} 讓出機會，但不是讓給你。`);
			setTimeout(function () {
				game.innerHTML = `<p>Roll the dice for the player: ${controller.nowPlayer.name}</p>`;
				document.querySelector('#actions > span').remove();
			}, 2000);
		};
	});

	socket.on('updatePlayStatus', function(data) {
		//not my Turn
		controller.removeDiceImgs();
		controller.makeDiceImg(data.dices);
		
		let count = data.dices.filter(x => x==1).length;

		//someone wins the game
		if (data.win == true) {
			controller.setScore(data.id, data.score);
			controller.winning(data.user, data.score);
			win = true;
			return;
		};

		if (count === 0) {
			controller.setScore(data.id, data.score);
			controller.updateScore();
			
			let span = document.querySelector('#actions > span');
			if (span) {
				span.textContent = `Player ${data.user} rolls ${data.dices.reduce( (prev, curr) => prev + curr )} points!`;
			}else {
				let span = document.createElement('span');
				span.textContent = `Player ${data.user} rolls ${data.dices.reduce( (prev, curr) => prev + curr )} points!`;
				span.style.display = "block";
				actions.appendChild(span);
			};
		} else if (count === data.dices.length) {
			/********* full of 1 *********/
			controller.setScore(data.id, data.score);
			controller.updateScore();
			controller.switchTurn(data.id, data.switchTo);

			if (socket.id == controller.nowPlayer.id) {
				controller.makeNotice(`哈哈! ${controller.data[data.id].name} 骰到兩個1，終於換我了吧!`);
				setTimeout(function () {
					game.innerHTML = `<p>Roll the dice for the player: ${controller.nowPlayer.name}</p>`;
					actions.innerHTML = `<button id="roll">Roll the Dice</button>`;
					document.querySelector('#roll').addEventListener('click', newTurn);
				}, 2000);
			} else {
				controller.makeNotice(`雖然 ${controller.data[data.id].name} 骰到兩個1，不過還沒輪到你哦~這輪請繼續看戲`);
				setTimeout(function () {
					game.innerHTML = `<p>Roll the dice for the player: ${controller.nowPlayer.name}</p>`;
					document.querySelector('#actions > span').remove();
				}, 2000);
			};
		} else if (count >= 1) {
			/********* 1's count >=1 but no more than full *********/
			controller.setScore(data.id, data.score);
			controller.updateScore();
			controller.switchTurn(data.id, data.switchTo);

			if (socket.id == controller.nowPlayer.id) {
				controller.makeNotice(`太幸運了吧! 終於輪到我了!`);
				setTimeout(function () {
					game.innerHTML = `<p>Roll the dice for the player: ${controller.nowPlayer.name}</p>`;
					actions.innerHTML = `<button id="roll">Roll the Dice</button>`;
					document.querySelector('#roll').addEventListener('click', newTurn);
				}, 2000);
			} else {
				controller.makeNotice(`雖然 ${controller.data[data.id].name} 手氣有點背，不過還沒輪到你哦~這輪請繼續看戲`);
				setTimeout(function () {
					game.innerHTML = `<p>Roll the dice for the player: ${controller.nowPlayer.name}</p>`;
					document.querySelector('#actions > span').remove();
				}, 2000);
			};
		};
	});
});
