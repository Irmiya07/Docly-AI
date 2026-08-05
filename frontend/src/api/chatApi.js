import api from "./axios";

export const askQuestion = async (question) => {
    try {
        const response = await api.post("/chat", { question });
        return response.data;
    } catch (error) {
        console.error("Error asking question:", error);
        throw error;
    }
};
