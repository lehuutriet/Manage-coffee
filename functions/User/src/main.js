import { Client, Users, ID } from 'node-appwrite';
// Initialize Appwrite client
const client = new Client()
  .setEndpoint('https://store.hjm.bid/v1') // Replace with your Appwrite endpoint
  .setProject('674818e10034704a2276') // Replace with your Appwrite project ID
  .setKey(
    '30bede4d09f3efbf3fa0b7c2c18ec142168584f3994e3ce3626f4a2da409d58d21ee1f85a304826dc863b9e9bdd294a48d0962926f5d032f62135d79a64e2cae6b05d43b50f3b4c47db2de62a6405338c19848954295903c05ac650017ccd2f077c0bb94627309c4d23b7cb6c33af1cb682c441a691ce1aea3c4eac4081fa52e'
  );

const users = new Users(client);

const createRecovery = async (req, res, log, error) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required for password recovery.',
      });
    }
    const recovery = await account.createRecovery(
      email,
      'https://https://d0085f6a-b2cf-41cc-960f-9e99876e9419-00-t8yvmv6opvl7.sisko.replit.dev/workpage/reset-password' // Replace with your actual redirect URL
    );
    return res.json({
      status: 'success',
      message: 'Password recovery email sent successfully.',
      recovery,
    });
  } catch (err) {
    error(`Failed to create password recovery: ${JSON.stringify(err)}`);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create password recovery.',
      details: err.message,
    });
  }
};
// Function to list users
const listUsers = async ({ req, res, log, error }) => {
  try {
    const userList = await users.list();
    log('User list retrieved:', userList);

    const userData = userList.users.map((user) => ({
      id: user.$id,
      name: user.name,
      email: user.email,
      status: user.status,
      phone: user.phone,
      registration: user.registration,
      accessedAt: user.lastLogin,
      labels: user.labels,
    }));

    return userData; // Changed to return userData directly
  } catch (err) {
    error('Failed to list users:', err.message);
    throw err; // Throw error to be handled by caller
  }
};
const addUsers = async ({ req, res, log, error }) => {
  try {
    log(`Received request body: ${JSON.stringify(req.body)}`);

    const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, password, name, phone, labels } = parsedBody;

    if (!email || !password || !name) {
      log('Missing required fields');
      return res.json({
        status: 'error',
        message: 'Email, password, and name are required fields.',
      });
    }

    log(`Attempting to create user: email=${email}, name=${name}, phone=${phone}, labels=${JSON.stringify(labels)}`);
    
    // Tạo user
    const newUser = await users.create(
      ID.unique(),
      email,
      phone || '',
      password,
      name
    );

    // Cập nhật labels ngay sau khi tạo user
    if (labels && labels.length > 0) {
      await users.updateLabels(newUser.$id, labels);
      // Fetch lại user để lấy thông tin mới nhất
      const updatedUser = await users.get(newUser.$id);
      return res.json({
        status: 'success',
        message: 'User added successfully',
        user: {
          id: updatedUser.$id,
          email: updatedUser.email,
          phone: updatedUser.phone,
          name: updatedUser.name,
          labels: updatedUser.labels
        }
      });
    }

    return res.json({
      status: 'success',
      message: 'User added successfully',
      user: {
        id: newUser.$id,
        email: newUser.email,
        phone: newUser.phone,
        name: newUser.name,
        labels: newUser.labels
      }
    });

  } catch (err) {
    error(`Failed to add user: ${JSON.stringify(err)}`);
    return res.json({
      status: 'error',
      message: 'Failed to add user.',
      details: err.message,
    });
  }
};
const deleteUser = async ({ req, res, log, error }) => {
  try {
    log(`Received delete request: ${JSON.stringify(req)}`);

    const userId = req.body;  // Assuming req.body is the user ID string

    log(`Attempting to delete user with ID: ${userId}`);

    if (!userId) {
      log('Missing userId');
      return res.json({
        status: 'error',
        message: 'User ID is required for deletion.',
      });
    }

    // Perform the actual deletion using Appwrite SDK
    await users.delete(userId);

    log(`User deleted successfully: ${userId}`);
    return res.json({
      status: 'success',
      message: 'User deleted successfully',
      deletedUserId: userId,
    });
  } catch (err) {
    error(`Failed to delete user: ${JSON.stringify(err)}`);
    return res.json({
      status: 'error',
      message: 'Failed to delete user.',
      details: err.message,
    });
  }
};

const updateUser = async ({ req, res, log, error }) => {
  try {
    const { userId, email, name, password, phone, labels } = req.body;

    if (!userId) {
      return res.json({
        status: "error",
        message: "User ID is required for updating.",
      });
    }

    let updateResult = {};

    // Update email if provided
    if (email) {
      try {
        updateResult.email = await users.updateEmail(userId, email);
      } catch (err) {
        throw new Error(`Email Update Failed: ${err.message}`);
      }
    }

    // Update name if provided
    if (name) {
      updateResult.name = await users.updateName(userId, name);
    }

    // Update password if provided
    if (password) {
      updateResult.password = await users.updatePassword(userId, password);
    }

    // Update phone if provided
    if (phone) {
      updateResult.phone = await users.updatePhone(userId, phone);
    }

    if (labels) {
      updateResult.labels = await users.updateLabels(userId, labels);
    }

    return res.json({
      status: "success",
      message: "User updated successfully",
      updates: updateResult,
    });
  } catch (err) {
    error(`Failed to update user: ${JSON.stringify(err)}`);
    return res.json({
      status: "error",
      message: "Failed to update user.",
      details: err.message,
    });
  }
};

// This is your Appwrite function
// It's executed each time we get a request
export default async ({ req, res, log, error }) => {
  // The `req` object contains the request data
  log(JSON.stringify(req));
  if (req.method === 'POST') {
    // OPTIONAL: Add condition to check for a specific path or query parameter to trigger listing users
    if (req.path === '/list-users') {
      return listUsers({ req, res, log, error });
    }
    if (req.path === '/add-users') {
      return addUsers({ req, res, log, error });
    }
      if (req.path === '/create-recovery') {
        return createRecovery(req, res, log, error);
      }
    // Send a response with the res object helpers
    return res.send('Hello, World!');
  }
  else if (req.method === 'DELETE') {
    if (req.path === '/delete-user') {
      return deleteUser({ req, res, log, error });
    }
  }
  if (req.method === 'PATCH') {
    if (req.path === '/update-user') {
      return updateUser({ req, res, log, error });
    }
  }
  // `res.json()` is a handy helper for sending JSON
  return res.json({
    method: req.method,
    message: 'method not support!!',
  });
};
