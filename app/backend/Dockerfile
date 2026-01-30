FROM node:25
WORKDIR /usr/src/app
# copy package.json and package-lock.json to the working directory
COPY package*.json ./
# copy data files to the working directory so that import.js can load CSV and metadata
COPY ./data ./data

# install app dependencies
RUN npm install
# bundle app source
COPY . .

EXPOSE 3000

# define the command to start your Node.js app
# the "start" section in package.json runs the import.js script first (to import the data
# from CSV to the MongoDB container) and then the script server.js to start the server
CMD ["npm", "start"]
