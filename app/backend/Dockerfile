# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory in the container - This is not the path of host machine
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Copy data files to the working directory so that import.js can load CSV and metadata
COPY ./data ./data

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Expose the port that the app will run on
EXPOSE 3000

# Define the command to start your Node.js app - The "start" section in package.json runs the import.js script first (to import the data
# from CSV to the MongoDB container) and then the script server.js to start the server
CMD ["npm", "start"]
