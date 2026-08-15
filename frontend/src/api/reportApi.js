import api from './axios';

export const generateReport = async (fileOrName, options = {}) => {
  const formData = new FormData();
  if (typeof fileOrName === 'string') {
    formData.append('filename', fileOrName);
  } else {
    formData.append('file', fileOrName);
  }

  try {
    const response = await api.post('/report/', formData, {
      headers: {
        'Content-Type': undefined
      },
      ...options
    });
    return response.data;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}