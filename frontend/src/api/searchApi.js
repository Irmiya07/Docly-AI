import api from "./axios";

export const searchDocuments = async (query,
  topK = 5,
  source=null

) => {
    try {
      const payload={
        query,
        top_k:topK,
      };
      if(source){
        payload.source=source;
      }
        const response = await api.post("/search/", payload);
        return response.data;
    } catch (error) {
        console.error("Error searching documents:", error);
        throw error;
    }
};
