FROM node:12.13-slim

ADD . /blog
WORKDIR /blog

RUN apt-get update
RUN npm install

CMD [ "npm", "run" "startprod" ]

