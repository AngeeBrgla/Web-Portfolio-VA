require('dotenv').config();

const path = require('path');
const express = require('express');
const contactApi = require('./api/contact');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const rootDirectory = path.resolve(__dirname);

app.disable('x-powered-by');
app.enable('trust proxy');

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

app.use('/images', express.static(path.join(rootDirectory, 'images')));
app.use('/resume', express.static(path.join(rootDirectory, 'resume')));
app.use(express.static(rootDirectory, { index: false }));

const apiRouter = express.Router();
apiRouter.post('/contact', async (req, res, next) => {
  try {
    await contactApi(req, res);
  } catch (err) {
    next(err);
  }
});
apiRouter.all('*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});
app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDirectory, 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDirectory, 'index.html'));
});

app.use((req, res) => {
  res.status(404).send('Resource not found');
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal server error. Please try again later.' });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
