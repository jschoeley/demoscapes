# D3.js_application
The app takes in demographic data which contains the mortality rates for various countries over various years and plots an interactive Heat Map.  
This Heat Map helps us to visualize the data, the difference between Male and Female mortality rates and distribution of Mortality over a period of time (in years) for various countries.

**Note:** This app consists of 2 files with the same name - dockerfile. 
The dockerfile inside the d3.js_docker folder is referred as server dockerfile and the dockerfile inside d3.js_docker/client-docker is referred as client dockerfile.

## To deploy the app:
1. Download/fork the folder - d3.js_docker into the local machine
2. In the docker-compose.yml file, make the following changes and save the .yml file
   2.1. Give the full path of the folder in which the server docker file relative to the local machine in **line 16**.
   2.2. Give the full path of the server dockerfile in **line 17**.
   2.3. Give the full path of the folder in which the client docker file relative to the local machine in **line 27**.
3. Next, open a terminal on the local machine and navigate to the folder in which the **docker-compose.yml** file is located in the local machine.
4. Run the command **docker-compose build** to build an image of the container.
5. After the image build is successful, run the **docker-compose up** command to start the container.
6. After a few minutes, go to the containers section of the docker desktop app. This section will have running container named **d3js_docker**. This main container will have 3 sub containers inside it:
   6.1. **d3js_docker-server-1** - A container for the backend server which handles the requests from client and routes data to/from the database
   6.2. **d3js_docker-nginx-1** - A container for the front end (client side) which displays the webpage.
   6.3. **d3js_docker-mongodb-1** - A container for the backend database (based on MongoDB) which stores the demographic data.
7. Click on the link beside the port mapping - **80:80** to launch the app in a web browser.
   
