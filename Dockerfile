# using python 3.9.6-slim-buster
FROM python:3.9.6-slim-buster

RUN mkdir "socketserver" && apt-get update && apt-get install -y locales locales-all

WORKDIR /socketserver
# copy src files
COPY . .
# pip install custom python packages
RUN pip install --upgrade pip && pip install -r requirements.txt 

EXPOSE 5000
# command to execute the "entry point startup.sh"
CMD ["python","main.py"]
