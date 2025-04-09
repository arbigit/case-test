import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = {
  getAllCases: async () => {
    const response = await axios.get(`${API_URL}/cases`);
    return response.data;
  },

  createCase: async (caseData) => {
    const response = await axios.post(`${API_URL}/cases`, caseData);
    return response.data;
  },

  updateCase: async (id, caseData) => {
    const response = await axios.put(`${API_URL}/cases/${id}`, caseData);
    return response.data;
  },

  deleteCase: async (id) => {
    const response = await axios.delete(`${API_URL}/cases/${id}`);
    return response.data;
  },
};

export default api;
