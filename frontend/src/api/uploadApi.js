import api from "./axios";

export const uploadFiles = async (files) => {
    const formData = new FormData();
     files.forEach((file) => {
        formData.append("files", file);
    });

    
    try {
        const response = await api.post("/upload/", formData, {
            headers: {
                "Content-Type": undefined
            }
        });
        return response.data;
    } catch (error) {
    console.log("Status:", error.response?.status);
    console.log("Response:", error.response?.data);

    throw error;
}
};
