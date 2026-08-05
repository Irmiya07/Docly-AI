import api from './axios';

export const compareDocs=async (file1,file2)=>{

  const formData=new FormData();
  formData.append('file1',file1);
  formData.append('file2',file2);

  try{
    const response=await api.post('/compare',formData,{
      headers:{
        'Content-Type':'multipart/form-data'
      }
    });
    return response.data;
  }catch(error){
    console.error('Error comparing documents:',error);
    throw error;
  }

};
