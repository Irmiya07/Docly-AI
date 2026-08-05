import api from './axios.js'

export const timeline= async (file)=>{
  const formData = new FormData();
  formData.append('file', file);
  try{
    const response = await api.post('/timeline', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
  catch (error) {
    console.error('Error generating timeline:', error);
    throw error;
  }
} 