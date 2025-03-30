import { Handler } from '@netlify/functions';
import app from '../../server';

// Create a handler for the Express app
const handler: Handler = async (event, context) => {
  // Convert Netlify event to Express request
  const req = {
    method: event.httpMethod,
    path: event.path.replace('/.netlify/functions/api', ''),
    headers: event.headers,
    body: event.body ? JSON.parse(event.body) : undefined,
  };

  // Create a response object
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader: (name: string, value: string) => {
      res.headers[name] = value;
    },
    send: (body: any) => {
      res.body = typeof body === 'string' ? body : JSON.stringify(body);
    },
    json: (body: any) => {
      res.body = JSON.stringify(body);
    },
  };

  // Handle the request
  await new Promise((resolve) => {
    app(req, res, () => {
      resolve(null);
    });
  });

  // Return the response
  return {
    statusCode: res.statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...res.headers,
    },
    body: res.body,
  };
};

export { handler }; 