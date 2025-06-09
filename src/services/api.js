import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

class ApiService {
  async getAllCases() {
    try {
      const response = await fetch(`${API_URL}/cases`);
      if (!response.ok) throw new Error('Failed to fetch cases');
      return response.json();
    } catch (error) {
      console.error('Error fetching cases:', error);
      throw error;
    }
  }

  async createCase(caseData) {
    try {
      console.log('Creating case with data:', caseData);
      const response = await fetch(`${API_URL}/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(caseData),
      });
      if (!response.ok) throw new Error('Failed to create case');
      return response.json();
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  async updateCase(id, caseData) {
    try {
      console.log('Updating case with ID:', id);
      console.log('Update data:', caseData);

      // Ensure we're using PUT method
      const response = await fetch(`${API_URL}/cases/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(caseData),
      });

      if (!response.ok) {
        console.error('Server responded with status:', response.status);
        throw new Error('Failed to update case');
      }

      const updatedCase = await response.json();
      console.log('Successfully updated case:', updatedCase);
      return updatedCase;
    } catch (error) {
      console.error('Error updating case:', error);
      throw error;
    }
  }

  async deleteCase(id) {
    try {
      console.log('Deleting case with ID:', id);
      const response = await fetch(`${API_URL}/cases/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete case');
      return response.json();
    } catch (error) {
      console.error('Error deleting case:', error);
      throw error;
    }
  }
}

export default new ApiService();
