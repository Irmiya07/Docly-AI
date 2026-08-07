import api from './axios';

export const compareDocs = async (fileOrName1, fileOrName2) => {
  const formData = new FormData();
  if (typeof fileOrName1 === 'string') {
    formData.append('filename1', fileOrName1);
  } else {
    formData.append('file1', fileOrName1);
  }
  if (typeof fileOrName2 === 'string') {
    formData.append('filename2', fileOrName2);
  } else {
    formData.append('file2', fileOrName2);
  }

  try {
    const response = await api.post('/compare', formData, {
      headers: {
        'Content-Type': undefined
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error comparing documents:', error);
    throw error;
  }
};
