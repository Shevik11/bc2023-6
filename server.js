const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require("body-parser");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerOptions = require('./swagger');

const app = express();
const port = 8000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.raw({ type: 'text/plain' }));
app.use(bodyParser.json());

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

const savePhotoInfo = (photoInfo) => {
  let data = { devices: [], users: [] };

    const fileContent = fs.readFileSync('photos.json', 'utf8');
    data = JSON.parse(fileContent);
  

  const photoWithDefaults = {
    identifier: photoInfo.identifier,
    name: photoInfo.name,
    description: photoInfo.description,
    serialNumber: photoInfo.serialNumber,
    manufacturer: photoInfo.manufacturer,
    filename: photoInfo.filename,
    usage: '',
    user: '',
  };

  data.devices.push(photoWithDefaults);

  if (photoInfo.user) {
    let user = data.users.find(u => u.name === photoInfo.user);

    if (!user) {
      user = { name: photoInfo.user, devices: [] };
      data.users.push(user);
    }

    user.devices.push(photoInfo.identifier);
  }

  fs.writeFileSync('photos.json', JSON.stringify(data, null, 2), 'utf8');
};





const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage }); 

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

/**
 * @swagger
 * /photo-info:
 *   get:
 *     summary: Get information about photos
 *     description: Retrieve information about all photos or a specific photo by identifier.
 *     parameters:
 *       - in: query
 *         name: identifier
 *         description: Identifier of the photo.
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Photo not found
 */



app.get('/photo-info/', (req, res) => {
  const filePath = 'photos.json';

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    const identifier = req.query.identifier;

    if (identifier) {
      const selectedDevice = data.devices.find(device => device.identifier === identifier);

      if (selectedDevice) {
        const { identifier, name, description, serialNumber, manufacturer } = selectedDevice;
        res.json({ identifier, name, description, serialNumber, manufacturer });
      } else {
        res.status(404).json({ error: 'Device not found' });
      }
    } else {
      const deviceInfo = data.devices.map(({ identifier, name, description, serialNumber, manufacturer }) => ({
        identifier,
        name,
        description,
        serialNumber,
        manufacturer,
      }));
      res.json(deviceInfo);
    }
  } catch (error) {
    console.error('Error during reading data from file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


  /**
 * @openapi
 * /show_photo/:
 *   get:
 *     summary: Get photo by identifier
 *     description: Retrieve the image file of a device by its identifier.
 *     parameters:
 *       - in: query
 *         name: identifier
 *         description: Device identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful response. Returns the image file.
 *       '400':
 *         description: Bad request. Identifier not provided.
 *       '404':
 *         description: Not Found. Device not found.
 *       '500':
 *         description: Internal server error.
 */
  
  app.get('/show_photo/', (req, res) => {
    try {
      const jsonData = fs.readFileSync('photos.json', 'utf8');
      const data = JSON.parse(jsonData);
  
      const identifier = req.query.identifier;
  
      if (!identifier) {
        return res.status(400).json({ error: 'Identifier not provided in the query parameters' });
      }
  
      const selectedDevice = data.devices.find(device => device.identifier === identifier);
  
      if (!selectedDevice) {
        return res.status(404).json({ error: 'Device not found' });
      }
  
      const imagePath = path.join(__dirname, 'uploads', selectedDevice.filename);
  
      res.setHeader('Content-Type', 'image/jpeg');
      
      res.sendFile(imagePath, (err) => {
        if (err) {
          console.error('Error sending image file:', err);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
  
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  


/**
 * @openapi
 * /add_user:
 *   post:
 *     summary: Add a new user
 *     description: Add a new user with the provided details.
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successful response. User added successfully.
 *       '400':
 *         description: Bad request. User with the login already exists.
 *       '500':
 *         description: Internal server error.
 */

app.post('/add_user', upload.none(), (req, res) => {
  try {
    const { name, surname, login, password } = req.body;

    const filePath = 'photos.json';
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) || { devices: [], users: [] };

    data.users = data.users || [];

    if (data.users.some(user => user.login === login)) {
      console.error('User with this login already exists');
      return res.status(400).json({ error: 'User with this login already exists' });
    }

    const newUser = { name, surname, login, password, devices: [] };
    data.users.push(newUser);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    res.json({ message: 'User added successfully!' });
  } catch (error) {
    console.error('Error during user addition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  
  
  
  /**
 * @openapi
 * /add_device_to_user:
 *   post:
 *     summary: Add a device to a user
 *     description: Add a device to a user with the provided details.
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               deviceIdentifier:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successful response. Device added to user successfully.
 *       '400':
 *         description: Bad request. Device is already in use or not found.
 *       '404':
 *         description: Not Found. User not found or device not found.
 *       '500':
 *         description: Internal server error.
 */
  
  app.post('/add_device_to_user', upload.none(), (req, res) => {
    try {
      const { deviceIdentifier, username } = req.body;
      console.log(deviceIdentifier, username);
  
      const filePath = 'photos.json';
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) || { devices: [], users: [] };
  
      data.users = data.users || [];
      data.devices = data.devices || [];
  
      const user = data.users.find(u => u.name === username);
      const device = data.devices.find(d => d.identifier === deviceIdentifier);
  
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!device) return res.status(404).json({ error: 'Device not found' });
      if (device.usage === 'is use') return res.status(400).json({ error: 'Device is already in use' });
  
      device.usage = 'is use';
      device.user = username;
  
      user.devices = user.devices || [];
      user.devices.push({ identifier: device.identifier, usage: 'is use' });
  
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  
      res.json({ message: 'Device added to user successfully!' });
    } catch (error) {
      console.error('Error during adding device to user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

/**
 * @openapi
 * /remove_device_from_user:
 *   post:
 *     summary: Remove a device from a user
 *     description: Remove a device from a user based on the provided details.
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               deviceIdentifier:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successful response. Device removed from user successfully.
 *       '404':
 *         description: Not Found. User not found or device not found in user's devices.
 *       '500':
 *         description: Internal server error.
 */
  
  
app.post('/remove_device_from_user', (req, res) => {
  const { deviceIdentifier, username } = req.body;
  const filePath = 'photos.json';

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) || { devices: [], users: [] };
    const user = data.users.find(u => u.name === username);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const deviceIndex = user.devices.findIndex(d => d.identifier === deviceIdentifier);

    if (deviceIndex === -1) return res.status(404).json({ error: 'Device not found in user\'s devices' });

    const device = user.devices[deviceIndex];
    device.usage = '';
    device.user = '';

    // Set usage and user values to an empty string in the devices array
    const deviceInDevicesArray = data.devices.find(d => d.identifier === deviceIdentifier);
    if (deviceInDevicesArray) {
      deviceInDevicesArray.usage = '';
      deviceInDevicesArray.user = '';
    }

    user.devices.splice(deviceIndex, 1);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    return res.json({ message: 'Device removed from user successfully!' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



/**
 * @openapi
 * /user_devices:
 *   get:
 *     summary: Get devices of a user
 *     description: Retrieve the devices associated with a user based on the provided username.
 *     parameters:
 *       - in: query
 *         name: username
 *         description: Username of the user
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful response. Returns devices associated with the user.
 *       '404':
 *         description: Not Found. User not found.
 *       '500':
 *         description: Internal server error.
 */

app.get('/user_devices', (req, res) => {
  try {
    const username = req.query.username;
    const filePath = 'photos.json';
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) || { devices: [], users: [] };

    const user = data.users.find(u => u.name === username);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const userDeviceIdentifiers = user.devices || [];
    
    res.json({ username, devices: userDeviceIdentifiers });
  } catch (error) {
    console.error('Error during fetching user devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





 /**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a photo
 *     description: Upload a photo with additional information.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Successful response. Photo uploaded successfully.
 *       '500':
 *         description: Internal server error.
 */
app.post('/upload', upload.single('photo'), (req, res) => {
  const { identifier, name, description, serialNumber, manufacturer } = req.body;
  const photoInfo = {
    identifier,
    name,
    description,
    serialNumber,
    manufacturer,
    filename: req.file.filename,
  };

  savePhotoInfo(photoInfo);

  res.status(200).json({ message: 'Photo uploaded successfully!' });
});



/**
 * @openapi
 * /get_all/devices:
 *   get:
 *     summary: Get all devices
 *     description: Retrieve information about all devices.
 *     responses:
 *       '200':
 *         description: Successful response. Returns an array of devices.
 *       '500':
 *         description: Internal server error.
 */
app.get("/get_all/devices", (req, res) => {
  const devices = JSON.parse(fs.readFileSync('photos.json', 'utf8')).devices || [];
  res.json(devices);
});


/**
 * @openapi
 * /get_all/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve information about all users.
 *     responses:
 *       '200':
 *         description: Successful response. Returns an array of users.
 *       '500':
 *         description: Internal server error.
 */


app.get("/get_all/users", (req, res) => {
  const users = JSON.parse(fs.readFileSync('photos.json', 'utf8')).users || [];
  res.json(users);
});

/**
 * @openapi
 * /edit_product:
 *   put:
 *     summary: Edit a product
 *     description: Edit a product with the provided details.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successful response. Product edited successfully.
 *       '404':
 *         description: Not Found. Product not found.
 *       '500':
 *         description: Internal server error.
 */

app.put("/edit_product", (req, res) => {
  try {
    const photos = JSON.parse(fs.readFileSync('photos.json', 'utf8')) || { devices: [], users: [] };
    const { identifier, name, description, serialNumber, manufacturer } = req.body;

    const index = photos.devices.findIndex(photo => String(photo.identifier) === String(identifier));

    if (index !== -1) {
      const existingPhoto = photos.devices[index];
      existingPhoto.name = name ?? existingPhoto.name;
      existingPhoto.description = description ?? existingPhoto.description;
      existingPhoto.serialNumber = serialNumber ?? existingPhoto.serialNumber;
      existingPhoto.manufacturer = manufacturer ?? existingPhoto.manufacturer;

      fs.writeFileSync('photos.json', JSON.stringify(photos, null, 2), 'utf8');
      res.json({ message: 'Product edited successfully!' });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @openapi
 * /delete_product:
 *   delete:
 *     summary: Delete a product
 *     description: Delete a product with the provided identifier.
 *     parameters:
 *       - in: query
 *         name: identifier
 *         description: Identifier of the product to be deleted
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful response. Product deleted successfully.
 *       '404':
 *         description: Not Found. Product not found.
 *       '500':
 *         description: Internal server error.
 */

app.delete("/delete_product", (req, res) => {
  try {
    const filePath = 'photos.json';

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read the existing data from the file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) || { devices: [], users: [] };
    
    // Extract devices array
    const devices = data.devices || [];

    // Get the identifier from the query parameters
    const identifier = req.query.identifier;

    // Find the index of the device with the given identifier
    const index = devices.findIndex(device => String(device.identifier) === String(identifier));

    if (index !== -1) {
      // Remove the device from the array
      devices.splice(index, 1);

      // Update the data object with the modified devices array
      data.devices = devices;

      // Write the updated data back to the file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      res.json({ message: 'Product deleted successfully!' });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Запуск серверу
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
