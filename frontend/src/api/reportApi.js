import api from './axios';

export const generateReport= async (file)=>{
  const formData = new FormData();
  formData.append('file', file);

  try{
    const response = await api.post('/report', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}