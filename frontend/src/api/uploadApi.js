import api from "./axios";

export const uploadFiles = async (files) => {
    const formData = new FormData();
     files.forEach((file) => {
        formData.append("files", file);
    });

    
    try {
        const response = await api.post("/upload/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};
