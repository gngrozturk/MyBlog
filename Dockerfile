FROM node:8.16-slim

ADD . /blog
WORKDIR /blog

RUN apt-get update
RUN npm install

CMD [ "npm start" ]

