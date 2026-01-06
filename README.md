# demoscapes.js

The app takes in demographic data which contains the mortality rates for various countries over years and ages and plots an interactive heat map.  

## To deploy the app:

1. Clone the folder ./app into the local machine.
2. In the `docker-compose.yml` file, adjust the paths to match your local paths.
3. Next, open a terminal on the local machine and navigate to the folder in which the `docker-compose.yml` file is located.
4. Run the command ``docker-compose build`` to build an image of the container.
5. After the image build is successful, run the ``docker-compose up`` command to start the container.
6. Open the app via localhost:80 in a browser.
