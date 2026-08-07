import api from './axios.js'

export const timeline = async (fileOrName) => {
  const formData = new FormData();
  if (typeof fileOrName === 'string') {
    formData.append('filename', fileOrName);
  } else {
    formData.append('file', fileOrName);
  }
  try {
    const response = await api.post('/timeline', formData, {
      headers: {
        'Content-Type': undefined
      }
    });
    return response.data;
  }
  catch (error) {
    console.error('Error generating timeline:', error);
    throw error;
  }
} 