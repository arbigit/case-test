import React, { useState, useEffect } from "react";
import {
  LineChart,
  BarChart,
  PieChart,
  Pie,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Bar,
  Cell,
  LabelList,
} from "recharts";
import {
  Activity,
  Home,
  Edit,
  Plus,
  Trash2,
  BarChart2,
  Search,
  FileText,
  AlertTriangle,
} from "lucide-react";
import api from './services/api';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';

// Add new constant for localStorage key
const STORAGE_KEY = 'dentalLabData';

// Create new wrapper component for the main app content
function AppContent() {
  const navigate = useNavigate();
  
  // Update state initializations with localStorage
  const [view, setView] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cases, setCases] = useState(() => {
    const savedCases = localStorage.getItem(`${STORAGE_KEY}_cases`);
    return savedCases ? JSON.parse(savedCases) : [];
  });
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const savedPeriod = localStorage.getItem(`${STORAGE_KEY}_period`);
    return savedPeriod || "1 month";
  });
  const [currentCase, setCurrentCase] = useState(() => {
    const savedCurrentCase = localStorage.getItem(`${STORAGE_KEY}_currentCase`);
    return savedCurrentCase ? JSON.parse(savedCurrentCase) : null;
  });
  const [searchFields, setSearchFields] = useState(() => {
    const savedSearchFields = localStorage.getItem(`${STORAGE_KEY}_searchFields`);
    return savedSearchFields ? JSON.parse(savedSearchFields) : {
      dateFrom: "",
      dateTo: "",
      firstName: "",
      lastName: "",
    };
  });

  // Add useEffect hooks to persist state changes
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_cases`, JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_period`, selectedPeriod);
  }, [selectedPeriod]);

  useEffect(() => {
    if (currentCase) {
      localStorage.setItem(`${STORAGE_KEY}_currentCase`, JSON.stringify(currentCase));
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_currentCase`);
    }
  }, [currentCase]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_searchFields`, JSON.stringify(searchFields));
  }, [searchFields]);

  // Modify the fetch cases effect to check if we already have data
  useEffect(() => {
    const fetchCases = async () => {
      // Only fetch if we don't have cases in state
      if (cases.length === 0) {
        try {
          const fetchedCases = await api.getAllCases();
          setCases(fetchedCases);
        } catch (error) {
          console.error('Error fetching cases:', error);
          showNotification('Error loading cases. Please try again.');
        }
      }
    };
    fetchCases();
  }, []); // Remove cases from dependency array to prevent infinite loop

  // Add a cleanup function to handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Optionally clear sensitive data or perform cleanup
      // localStorage.removeItem(`${STORAGE_KEY}_currentCase`);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Application state
  const [currentPage, setCurrentPage] = useState(1);
  const casesPerPage = 10;

  // Fetch cases on component mount
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const fetchedCases = await api.getAllCases();
        setCases(fetchedCases);
      } catch (error) {
        console.error('Error fetching cases:', error);
        showNotification('Error loading cases. Please try again.');
      }
    };
    fetchCases();
  }, []);

  // Calculating analytics data based on cases and selected period
  const getAnalyticsData = () => {
    if (cases.length === 0)
      return {
        overallScore: 0,
        totalCases: 0,
        successRate: 0,
        returnRate: 0,
        revisionSuccessRate: 0,
        metricAverages: {
          margins: 0,
          contacts: 0,
          occlusion: 0,
          color: 0,
          contour: 0,
        },
        returnBreakdown: {
          margins: 0,
          contacts: 0,
          occlusion: 0,
          color: 0,
          contour: 0,
        },
        scoreDistribution: {
          0: { margins: 0, contacts: 0, occlusion: 0, color: 0, contour: 0 },
          1: { margins: 0, contacts: 0, occlusion: 0, color: 0, contour: 0 },
          2: { margins: 0, contacts: 0, occlusion: 0, color: 0, contour: 0 },
        },
      };

    // Filter cases by selected period
    const filteredCases = filterCasesByPeriod(cases, selectedPeriod);

    // Calculate metric averages
    const metricAverages = {
      margins: calculateAverage(filteredCases.map((c) => c.scores.margins)),
      contacts: calculateAverage(filteredCases.map((c) => c.scores.contacts)),
      occlusion: calculateAverage(filteredCases.map((c) => c.scores.occlusion)),
      color: calculateAverage(filteredCases.map((c) => c.scores.color)),
      contour: calculateAverage(filteredCases.map((c) => c.scores.contour)),
    };

    // Calculate overall score
    const overallScore = calculateAverage([
      metricAverages.margins,
      metricAverages.contacts,
      metricAverages.occlusion,
      metricAverages.color,
      metricAverages.contour,
    ]);

    // Count cases with failures (score of 0 in any metric)
    const casesWithFailures = filteredCases.filter(
      (c) =>
        c.scores.margins === 0 ||
        c.scores.contacts === 0 ||
        c.scores.occlusion === 0 ||
        c.scores.color === 0 ||
        c.scores.contour === 0
    );

    // Calculate success and return rates
    const returnRate =
      filteredCases.length > 0
        ? (casesWithFailures.length / filteredCases.length) * 100
        : 0;
    const successRate = 100 - returnRate;

    // Count number of zeros for each metric
    const returnBreakdown = {
      margins: filteredCases.filter((c) => c.scores.margins === 0).length,
      contacts: filteredCases.filter((c) => c.scores.contacts === 0).length,
      occlusion: filteredCases.filter((c) => c.scores.occlusion === 0).length,
      color: filteredCases.filter((c) => c.scores.color === 0).length,
      contour: filteredCases.filter((c) => c.scores.contour === 0).length,
    };

    // Create score distribution data
    const scoreDistribution = {
      0: {
        margins: filteredCases.filter((c) => c.scores.margins === 0).length,
        contacts: filteredCases.filter((c) => c.scores.contacts === 0).length,
        occlusion: filteredCases.filter((c) => c.scores.occlusion === 0).length,
        color: filteredCases.filter((c) => c.scores.color === 0).length,
        contour: filteredCases.filter((c) => c.scores.contour === 0).length,
      },
      1: {
        margins: filteredCases.filter((c) => c.scores.margins === 1).length,
        contacts: filteredCases.filter((c) => c.scores.contacts === 1).length,
        occlusion: filteredCases.filter((c) => c.scores.occlusion === 1).length,
        color: filteredCases.filter((c) => c.scores.color === 1).length,
        contour: filteredCases.filter((c) => c.scores.contour === 1).length,
      },
      2: {
        margins: filteredCases.filter((c) => c.scores.margins === 2).length,
        contacts: filteredCases.filter((c) => c.scores.contacts === 2).length,
        occlusion: filteredCases.filter((c) => c.scores.occlusion === 2).length,
        color: filteredCases.filter((c) => c.scores.color === 2).length,
        contour: filteredCases.filter((c) => c.scores.contour === 2).length,
      },
    };

    // Filter for cases with all metrics scored 1 or higher
    const successfulRevisions = filteredCases.filter(
      (c) =>
        c.scores.margins >= 1 &&
        c.scores.contacts >= 1 &&
        c.scores.occlusion >= 1 &&
        c.scores.color >= 1 &&
        c.scores.contour >= 1
    );

    // Calculate revision success rate
    const revisionSuccessRate =
      filteredCases.length > 0
        ? (successfulRevisions.length / filteredCases.length) * 100
        : 0;

    return {
      overallScore,
      totalCases: filteredCases.length,
      successRate,
      returnRate,
      revisionSuccessRate,
      metricAverages,
      returnBreakdown,
      scoreDistribution,
    };
  };

  // Helper functions
  const calculateAverage = (values) => {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const filterCasesByPeriod = (cases, period) => {
    if (cases.length === 0) return [];

    const today = new Date();
    let cutoffDate = new Date();

    switch (period) {
      case "1 month":
        cutoffDate.setMonth(today.getMonth() - 1);
        break;
      case "3 months":
        cutoffDate.setMonth(today.getMonth() - 3);
        break;
      case "YTD":
        cutoffDate = new Date(today.getFullYear(), 0, 1);
        break;
      case "1 year":
        cutoffDate.setFullYear(today.getFullYear() - 1);
        break;
      case "5 years":
        cutoffDate.setFullYear(today.getFullYear() - 5);
        break;
      case "All Time":
        return [...cases];
      default:
        cutoffDate.setMonth(today.getMonth() - 1);
    }

    return cases.filter((c) => new Date(c.dateRecorded) >= cutoffDate);
  };

  // Update handleSaveCase to handle persistence
  const handleSaveCase = async (caseData) => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      const isEdit = window.location.pathname === '/edit';
      let savedCase;
      
      if (isEdit) {
        savedCase = await api.updateCase(currentCase._id, caseData);
        setCases(cases.map((c) => (c._id === currentCase._id ? savedCase : c)));
        showNotification('Case updated successfully');
      } else {
        savedCase = await api.createCase({
          ...caseData,
          createdAt: new Date().toISOString(),
        });
        setCases([savedCase, ...cases]);
        showNotification('New case added successfully');
      }
      
      setCurrentCase(null); // This will trigger removal from localStorage
      navigate('/');
    } catch (error) {
      console.error('Error saving case:', error);
      const action = window.location.pathname === '/edit' ? 'updating' : 'adding';
      showNotification(`Error ${action} case. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to navigate back to home
  const goHome = () => {
    setView("home");
  };

  // Update handleDeleteCase to use API
  const handleDeleteCase = async (caseId) => {
    try {
      await api.deleteCase(caseId);
      setCases(cases.filter((c) => c._id !== caseId));
      setCurrentCase(null); // Clear the current case
      setView("home"); // Navigate to home instead of revise
      showNotification('Case deleted successfully');
    } catch (error) {
      console.error('Error deleting case:', error);
      showNotification('Error deleting case. Please try again.');
    }
  };

  // Search for cases based on input fields
  const handleSearchCases = () => {
    // Logic would be implemented here to filter cases
    // For now, this is just a placeholder
  };

  // Show notification message
  const [notification, setNotification] = useState(null);
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Remove the confirm modal and directly execute the callback
  const handleLeavePage = (callback) => {
    callback();
  };

  // Generate PDF report
  const generateReport = () => {
    const analytics = getAnalyticsData();
    alert(
      `PDF Report generated for period: ${selectedPeriod}\nTotal Cases: ${
        analytics.totalCases
      }\nSuccess Rate: ${analytics.successRate.toFixed(1)}%`
    );

    // Real implementation would generate and download PDF
    showNotification("Report has been generated and is ready for download.");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-black text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-green-200 rounded-md mr-4"></div>
          <div className="hidden sm:flex">
            <span className="mr-6">Find New Lab</span>
            <span>Contact Support</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/add" element={
            <CaseForm 
              onSave={handleSaveCase}
              onCancel={() => handleLeavePage(() => navigate('/'))}
            />
          } />
          <Route path="/revise" element={
            <ReviseCase
              cases={cases}
              searchFields={searchFields}
              setSearchFields={setSearchFields}
              onSearch={handleSearchCases}
              onEdit={(caseData) => {
                setCurrentCase(caseData);
                navigate('/edit');
              }}
              onDelete={handleDeleteCase}
            />
          } />
          <Route path="/edit" element={
            <CaseForm
              caseData={currentCase}
              onSave={handleSaveCase}
              onCancel={() => handleLeavePage(() => navigate('/revise'))}
            />
          } />
          <Route path="/analytics" element={
            <Analytics
              data={getAnalyticsData()}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              onGenerateReport={generateReport}
              cases={cases}
            />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-md shadow-lg">
          {notification}
        </div>
      )}
    </div>
  );
}

// Main application component
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Home view component
function HomeView() {
  const navigate = useNavigate();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold border-b pb-2 mb-6">Labs</h1>

      <div className="mb-6">
        <div className="w-full bg-white rounded-full overflow-hidden border border-gray-300">
          <div className="flex">
            <div className="w-1/4 p-4 border-r border-gray-200 flex items-center">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div>
                <div className="font-bold">Petrie Dental Lab</div>
                <div className="text-blue-500 text-sm">Profile</div>
              </div>
            </div>
            <div className="w-3/4 grid grid-cols-3">
              <button
                onClick={() => navigate('/add')}
                className="flex flex-col items-center justify-center p-4 hover:bg-green-50 transition"
              >
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mb-1">
                  <Plus className="h-6 w-6" />
                </div>
                <span>Add Case</span>
              </button>
              <button
                onClick={() => navigate('/revise')}
                className="flex flex-col items-center justify-center p-4 hover:bg-green-50 transition"
              >
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mb-1">
                  <Edit className="h-6 w-6" />
                </div>
                <span>Revise Case</span>
              </button>
              <button
                onClick={() => navigate('/analytics')}
                className="flex flex-col items-center justify-center p-4 hover:bg-green-50 transition"
              >
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mb-1">
                  <Activity className="h-6 w-6" />
                </div>
                <span>Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="flex justify-center">
        <button className="bg-blue-500 text-white py-2 px-6 rounded-full flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Add New Lab
        </button>
      </div> */}
    </div>
  );
}

// Case form component
function CaseForm({ caseData = null, onSave, onCancel }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    dateRecorded: caseData?.dateRecorded || getCurrentDate(),
    firstName: caseData?.firstName || "",
    lastName: caseData?.lastName || "",
    scores: {
      margins: caseData?.scores?.margins ?? null,
      contacts: caseData?.scores?.contacts ?? null,
      occlusion: caseData?.scores?.occlusion ?? null,
      color: caseData?.scores?.color ?? null,
      contour: caseData?.scores?.contour ?? null,
    },
  });

  // Add new state for modal
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Function to handle back arrow click
  const handleBackClick = () => {
    setIsSuccess(false);
    setShowModal(true);
  };

  const [formErrors, setFormErrors] = useState({});

  // Get current date in YYYY-MM-DD format
  function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Update form data
  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  // Update score
  const handleScoreChange = (metric, value) => {
    setFormData({
      ...formData,
      scores: {
        ...formData.scores,
        [metric]: value,
      },
    });
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.dateRecorded) errors.dateRecorded = "Date is required";
    if (!formData.firstName) errors.firstName = "First name is required";
    if (!formData.lastName) errors.lastName = "Last name initial is required";

    // Check if all scores are selected
    const metrics = ["margins", "contacts", "occlusion", "color", "contour"];
    metrics.forEach((metric) => {
      if (formData.scores[metric] === null) {
        errors[metric] = `Score for ${metric} is required`;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = () => {
    if (validateForm()) {
      setIsSuccess(true);
      setShowModal(true);
      // Close modal, save, and navigate to home after 2 seconds
      setTimeout(() => {
        setShowModal(false);
        onSave({
          ...formData,
          id: caseData?._id,
        });
        navigate('/');
      }, 2000);
    } else {
      setIsSuccess(false);
      setShowModal(true);
      // Close error modal after 2 seconds
      setTimeout(() => {
        setShowModal(false);
      }, 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button onClick={handleBackClick} className="text-blue-500 mr-4">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
        <h1 className="text-xl font-bold">
          {caseData ? "Edit Case" : "Add Case"}
        </h1>
        <div className="ml-auto">
          <div className="bg-blue-500 text-white py-2 px-4 rounded-md">
            Petrie Dental Lab
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        {/* Patient info */}
        <div className="flex flex-wrap -mx-2 mb-6 p-4 bg-green-50 rounded-xl">
          <div className="px-2 w-full sm:w-1/3 mb-4 sm:mb-0">
            <label className="block text-sm mb-1">Date*</label>
            <input
              type="date"
              value={formData.dateRecorded}
              onChange={(e) =>
                handleInputChange("dateRecorded", e.target.value)
              }
              className={`w-full p-2 border rounded-md ${
                formErrors.dateRecorded ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.dateRecorded && (
              <p className="text-red-500 text-xs mt-1">
                {formErrors.dateRecorded}
              </p>
            )}
          </div>
          <div className="px-2 w-full sm:w-1/3 mb-4 sm:mb-0">
            <label className="block text-sm mb-1">First Name*</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className={`w-full p-2 border rounded-md ${
                formErrors.firstName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.firstName && (
              <p className="text-red-500 text-xs mt-1">
                {formErrors.firstName}
              </p>
            )}
          </div>
          <div className="px-2 w-full sm:w-1/3">
            <label className="block text-sm mb-1">Last Name Initial*</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              maxLength={1}
              className={`w-full p-2 border rounded-md ${
                formErrors.lastName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.lastName && (
              <p className="text-red-500 text-xs mt-1">{formErrors.lastName}</p>
            )}
          </div>
        </div>

        {/* Scoring section */}
        <div className="border border-gray-200 rounded-xl p-6">
          {/* Margins */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <div className="bg-green-100 p-2 rounded-md text-green-800 mr-2">
                Margins:
              </div>
              {formErrors.margins && (
                <p className="text-red-500 text-xs">{formErrors.margins}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleScoreChange("margins", 0)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.margins === 0
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                0 - Failure (Return to lab)
              </button>
              <button
                onClick={() => handleScoreChange("margins", 1)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.margins === 1
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                1 - Significant Adjustment
              </button>
              <button
                onClick={() => handleScoreChange("margins", 2)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.margins === 2
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                2 - No or Slight Adjustment
              </button>
            </div>
          </div>

          {/* Contacts */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <div className="bg-green-100 p-2 rounded-md text-green-800 mr-2">
                Contacts:
              </div>
              {formErrors.contacts && (
                <p className="text-red-500 text-xs">{formErrors.contacts}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleScoreChange("contacts", 0)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.contacts === 0
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                0 - Failure (Return to lab)
              </button>
              <button
                onClick={() => handleScoreChange("contacts", 1)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.contacts === 1
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                1 - Significant Adjustment
              </button>
              <button
                onClick={() => handleScoreChange("contacts", 2)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.contacts === 2
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                2 - No or Slight Adjustment
              </button>
            </div>
          </div>

          {/* Occlusion */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <div className="bg-green-100 p-2 rounded-md text-green-800 mr-2">
                Occlusion:
              </div>
              {formErrors.occlusion && (
                <p className="text-red-500 text-xs">{formErrors.occlusion}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleScoreChange("occlusion", 0)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.occlusion === 0
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                0 - Failure (Return to lab)
              </button>
              <button
                onClick={() => handleScoreChange("occlusion", 1)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.occlusion === 1
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                1 - Significant Adjustment
              </button>
              <button
                onClick={() => handleScoreChange("occlusion", 2)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.occlusion === 2
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                2 - No or Slight Adjustment
              </button>
            </div>
          </div>

          {/* Color */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <div className="bg-green-100 p-2 rounded-md text-green-800 mr-2">
                Color:
              </div>
              {formErrors.color && (
                <p className="text-red-500 text-xs">{formErrors.color}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleScoreChange("color", 0)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.color === 0
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                0 - Failure (Return to lab)
              </button>
              <button
                onClick={() => handleScoreChange("color", 1)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.color === 1
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                1 - Significant Adjustment
              </button>
              <button
                onClick={() => handleScoreChange("color", 2)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.color === 2
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                2 - No or Slight Adjustment
              </button>
            </div>
          </div>

          {/* Contour */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <div className="bg-green-100 p-2 rounded-md text-green-800 mr-2">
                Contour:
              </div>
              {formErrors.contour && (
                <p className="text-red-500 text-xs">{formErrors.contour}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleScoreChange("contour", 0)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.contour === 0
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                0 - Failure (Return to lab)
              </button>
              <button
                onClick={() => handleScoreChange("contour", 1)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.contour === 1
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                1 - Significant Adjustment
              </button>
              <button
                onClick={() => handleScoreChange("contour", 2)}
                className={`flex-1 p-2 rounded-md ${
                  formData.scores.contour === 2
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200"
                }`}
              >
                2 - No or Slight Adjustment
              </button>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSubmit}
            className="bg-black text-white py-2 px-6 rounded-md hover:bg-gray-800"
          >
            {caseData ? "Update" : "Submit"}
          </button>
        </div>
      </div>

      {/* Updated Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-xl p-6 shadow-lg transform transition-all duration-300 ease-in-out ${showModal ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            <div className="text-center">
              {isSuccess ? (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Case has been submitted</h3>
                  <p className="text-sm text-gray-500">Your case entry has been successfully saved.</p>
                </>
              ) : (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Case entry will not be saved</h3>
                  <p className="text-sm text-gray-500 mb-4">Are you sure you want to leave this page?</p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        navigate('/');
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                    >
                      Leave
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                    >
                      Stay
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add this helper function near your other utility functions
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

// Update ReviseCase component's case display
function ReviseCase({
  cases,
  searchFields,
  setSearchFields,
  onSearch,
  onEdit,
  onDelete,
}) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const casesPerPage = 10;

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch();
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleInputChange = (field, value) => {
    setSearchFields({
      ...searchFields,
      [field]: value,
    });
  };

  // Filter cases based on search criteria
  const filteredCases = cases.filter((c) => {
    const dateFrom = searchFields.dateFrom ? new Date(searchFields.dateFrom) : null;
    const dateTo = searchFields.dateTo ? new Date(searchFields.dateTo) : null;
    const caseDate = new Date(c.dateRecorded);

    const dateMatch = (!dateFrom || caseDate >= dateFrom) && (!dateTo || caseDate <= dateTo);
    const firstNameMatch = !searchFields.firstName || 
      c.firstName.toLowerCase().includes(searchFields.firstName.toLowerCase());
    const lastNameMatch = !searchFields.lastName || 
      c.lastName.toLowerCase().includes(searchFields.lastName.toLowerCase());

    return dateMatch && firstNameMatch && lastNameMatch;
  });

  // Sort cases by date (most recent first)
  const sortedCases = [...filteredCases].sort((a, b) => {
    return new Date(b.dateRecorded) - new Date(a.dateRecorded);
  });

  // Calculate pagination
  const indexOfLastCase = currentPage * casesPerPage;
  const indexOfFirstCase = indexOfLastCase - casesPerPage;
  const currentCases = sortedCases.slice(indexOfFirstCase, indexOfLastCase);
  const totalPages = Math.ceil(sortedCases.length / casesPerPage);

  // Generate page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button onClick={() => navigate('/')} className="text-blue-500 mr-4">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
        <h1 className="text-xl font-bold">Revise Case</h1>
        <div className="ml-auto">
          <div className="bg-green-100 text-green-800 py-2 px-4 rounded-md">
            Petrie Dental Lab
          </div>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Search Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-700">Search Filters</h2>
            </div>
          </div>

          {/* Search Fields */}
          <div className="p-6 space-y-6">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date Range</label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">From</span>
                    </div>
                    <input
                      type="date"
                      value={searchFields.dateFrom}
                      onChange={(e) => handleInputChange("dateFrom", e.target.value)}
                      className="block w-full pl-16 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">To</span>
                    </div>
                    <input
                      type="date"
                      value={searchFields.dateTo}
                      onChange={(e) => handleInputChange("dateTo", e.target.value)}
                      className="block w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by first name"
                    value={searchFields.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Last Name Initial</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by last name initial"
                    value={searchFields.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Search Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setSearchFields({
                  dateFrom: "",
                  dateTo: "",
                  firstName: "",
                  lastName: "",
                });
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      <div className="space-y-4">
        {currentCases.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">
              No cases found. Please add cases or modify your search.
            </p>
          </div>
        ) : (
          <>
            {currentCases.map((caseItem) => (
              <div
                key={caseItem._id}
                className="bg-black text-white p-4 rounded-xl shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex space-x-8">
                    <div>{formatDate(caseItem.dateRecorded)}</div>
                    <div>{caseItem.firstName}</div>
                    <div>{caseItem.lastName}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        onEdit({
                          ...caseItem,
                          dateRecorded: formatDate(caseItem.dateRecorded)
                        });
                        navigate('/edit');
                      }}
                      className="bg-white text-blue-500 py-1 px-4 rounded-md hover:bg-gray-100 flex items-center"
                    >
                      Edit
                      <Edit className="ml-2 h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(caseItem._id)}
                      className="text-red-400 p-1 rounded-md hover:bg-gray-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div className="flex justify-center mt-6">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  Previous
                </button>
                
                {pageNumbers.map(number => (
                  <button
                    key={number}
                    onClick={() => setCurrentPage(number)}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === number
                        ? 'bg-black text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  Next
                </button>
              </nav>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Analytics component
function Analytics({
  data,
  selectedPeriod,
  onPeriodChange,
  onGenerateReport,
  cases,
}) {
  const navigate = useNavigate();

  const periods = [
    "1 month",
    "3 months",
    "YTD",
    "1 year",
    "5 years",
    "All Time",
  ];

  // Format number with one decimal place
  const formatNumber = (num) => {
    return num.toFixed(1);
  };

  // Format percentage
  const formatPercent = (num) => {
    return num.toFixed(1) + "%";
  };

  // Get month names for last 5 months for chart display
  const getLastFiveMonths = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const result = [];
    const today = new Date();

    for (let i = 4; i >= 0; i--) {
      const monthIndex = (today.getMonth() - i + 12) % 12;
      result.push(months[monthIndex]);
    }

    return result;
  };

  const lastFiveMonths = getLastFiveMonths();

  // Add helper function to get time periods based on selected filter
  const getTimePeriodsForChart = () => {
    const periods = [];
    const today = new Date();
    
    switch (selectedPeriod) {
      case "1 month":
        // Show days of the month
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          periods.unshift(date.getDate().toString());
        }
        break;
        
      case "3 months":
        // Show weeks (W1, W2, etc.)
        for (let i = 0; i < 12; i++) {
          periods.unshift(`W${i + 1}`);
        }
        break;
        
      case "YTD":
        // Show months from start of year
        const currentMonth = today.getMonth();
        for (let i = 0; i <= currentMonth; i++) {
          const date = new Date(today.getFullYear(), i, 1);
          periods.push(date.toLocaleString('default', { month: 'short' }));
        }
        break;
        
      case "1 year":
        // Show all months
        for (let i = 0; i < 12; i++) {
          const date = new Date(today.getFullYear(), i, 1);
          periods.push(date.toLocaleString('default', { month: 'short' }));
        }
        break;
        
      case "5 years":
        // Show years
        const currentYear = today.getFullYear();
        for (let i = 4; i >= 0; i--) {
          periods.push((currentYear - i).toString());
        }
        break;
        
      case "All Time":
        // Show years from first case
        const oldestCase = Math.min(...cases.map(c => new Date(c.dateRecorded).getFullYear()));
        for (let year = oldestCase; year <= today.getFullYear(); year++) {
          periods.push(year.toString());
        }
        break;
        
      default:
        // Default to last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          periods.unshift(date.getDate().toString());
        }
    }
    
    return periods;
  };

  // Update metric trends data based on selected period and actual cases
  const getMetricTrendsData = () => {
    const periods = getTimePeriodsForChart();
    const today = new Date();
    
    return periods.map((period) => {
      let filteredCases = [];
      
      if (!cases || cases.length === 0) {
        return {
          name: period,
          overall: 0,
          margins: 0,
          contacts: 0,
          occlusion: 0,
          color: 0,
          contour: 0,
          count: 0
        };
      }

      switch (selectedPeriod) {
        case "1 month":
          // Filter cases for specific day
          filteredCases = cases.filter(c => {
            const caseDate = new Date(c.dateRecorded);
            return caseDate.getDate().toString() === period &&
                   caseDate.getMonth() === today.getMonth() &&
                   caseDate.getFullYear() === today.getFullYear();
          });
          break;
          
        case "3 months":
          // Filter cases for specific week
          const weekNumber = parseInt(period.substring(1));
          filteredCases = cases.filter(c => {
            const caseDate = new Date(c.dateRecorded);
            const caseDaysAgo = Math.floor((today - caseDate) / (1000 * 60 * 60 * 24));
            const caseWeek = Math.ceil(caseDaysAgo / 7);
            return caseWeek === weekNumber && caseDaysAgo <= 90;
          });
          break;
          
        case "YTD":
        case "1 year":
          // Filter cases for specific month
          filteredCases = cases.filter(c => {
            const caseDate = new Date(c.dateRecorded);
            return caseDate.toLocaleString('default', { month: 'short' }) === period &&
                   (selectedPeriod === "YTD" ? 
                     caseDate.getFullYear() === today.getFullYear() :
                     (today - caseDate) <= 365 * 24 * 60 * 60 * 1000);
          });
          break;
          
        case "5 years":
        case "All Time":
          // Filter cases for specific year
          filteredCases = cases.filter(c => {
            const caseDate = new Date(c.dateRecorded);
            return caseDate.getFullYear().toString() === period;
          });
          break;
          
        default:
          filteredCases = [];
      }

      // Calculate averages for each metric
      const margins = calculateAverage(filteredCases.map(c => c.scores.margins));
      const contacts = calculateAverage(filteredCases.map(c => c.scores.contacts));
      const occlusion = calculateAverage(filteredCases.map(c => c.scores.occlusion));
      const color = calculateAverage(filteredCases.map(c => c.scores.color));
      const contour = calculateAverage(filteredCases.map(c => c.scores.contour));
      
      // Calculate overall as average of all other metrics
      const overall = calculateAverage([margins, contacts, occlusion, color, contour]);

      return {
        name: period,
        overall,
        margins,
        contacts,
        occlusion,
        color,
        contour,
        // Add count for tooltip
        count: filteredCases.length
      };
    });
  };

  // Helper function to calculate average
  const calculateAverage = (values) => {
    if (!values || values.length === 0) return 0;
    const validValues = values.filter(v => v !== null && v !== undefined);
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  };

  // Update the metricTrendsData when period changes
  const metricTrendsData = getMetricTrendsData();

  // Generate success rate data based on selected period
  const getSuccessRateData = () => {
    const periods = getTimePeriodsForChart();
    const today = new Date();
    
    return periods.map((period) => {
      let filteredCases = [];
      
      if (!cases || cases.length === 0) {
        return {
          name: period,
          rate: 0,
          count: 0
        };
      }

      switch (selectedPeriod) {
        case "1 month":
          filteredCases = cases.filter(c => {
            const caseDate = new Date(c.dateRecorded);
            return caseDate.getDate().toString() === period &&
                   caseDate.getMonth() === today.getMonth() &&
                   caseDate.getFullYear() === today.getFullYear();
          });
          break;
          
        case "3 months":
          const weekNumber = parseInt(period.substring(1));
          filteredCases = cases.filter(c => {
            const caseDate = new Date(c.dateRecorded);
            const caseDaysAgo = Math.floor((today - caseDate) / (1000 * 60 * 60 * 24));
            const caseWeek = Math.ceil(caseDaysAgo / 7);
            return caseWeek === weekNumber && caseDaysAgo <= 90;
          });
          break;
          
        case "YTD":
        case "1 year":
          filteredCases = cases.filter(c => {
            const caseDate = new Date(c.dateRecorded);
            return caseDate.toLocaleString('default', { month: 'short' }) === period &&
                   (selectedPeriod === "YTD" ? 
                     caseDate.getFullYear() === today.getFullYear() :
                     (today - caseDate) <= 365 * 24 * 60 * 60 * 1000);
          });
          break;
          
        case "5 years":
        case "All Time":
          filteredCases = cases.filter(c => {
            const caseDate = new Date(c.dateRecorded);
            return caseDate.getFullYear().toString() === period;
          });
          break;
          
        default:
          filteredCases = [];
      }

      // Calculate success rate
      const successfulCases = filteredCases.filter(c => 
        c.scores.margins >= 1 &&
        c.scores.contacts >= 1 &&
        c.scores.occlusion >= 1 &&
        c.scores.color >= 1 &&
        c.scores.contour >= 1
      );

      const rate = filteredCases.length > 0
        ? (successfulCases.length / filteredCases.length) * 100
        : 0;

      return {
        name: period,
        rate,
        count: filteredCases.length
      };
    });
  };

  // Get success rate data
  const successRateData = getSuccessRateData();

  // Add state for visible metrics
  const [visibleMetrics, setVisibleMetrics] = useState({
    overall: true,
    margins: true,
    contacts: true,
    occlusion: true,
    color: true,
    contour: true
  });

  // Helper function to toggle metrics
  const toggleMetric = (metric) => {
    setVisibleMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  // Prepare data for stacked bar chart
  const getScoreDistributionData = () => {
    const metrics = ['margins', 'contacts', 'occlusion', 'color', 'contour'];
    
    return metrics.map(metric => ({
      name: metric.charAt(0).toUpperCase() + metric.slice(1),
      'Score 0': data.scoreDistribution[0][metric],
      'Score 1': data.scoreDistribution[1][metric],
      'Score 2': data.scoreDistribution[2][metric],
      total: data.scoreDistribution[0][metric] + 
             data.scoreDistribution[1][metric] + 
             data.scoreDistribution[2][metric]
    }));
  };

  // Get score distribution data
  const scoreDistributionData = getScoreDistributionData();

  // Add generateReport function with page management
  const generateReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;
    
    // Helper function to check and add new page if needed
    const checkAndAddPage = (heightNeeded) => {
      if (yPos + heightNeeded >= pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Title
    doc.setFontSize(20);
    doc.text('Analytics Report', pageWidth/2, yPos, { align: 'center' });
    
    // Period
    yPos += 15;
    doc.setFontSize(12);
    doc.text(`Period: ${selectedPeriod}`, pageWidth/2, yPos, { align: 'center' });
    
    // Date Generated
    yPos += 10;
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth/2, yPos, { align: 'center' });
    
    // Key Metrics Section
    checkAndAddPage(40);
    yPos += 25;
    doc.setFontSize(16);
    doc.text('Key Metrics', margin, yPos);
    
    // Metrics data
    yPos += 10;
    doc.setFontSize(12);
    const metrics = [
      { label: 'Overall Score', value: `${formatNumber(data.overallScore)}/2` },
      { label: 'Total Cases', value: data.totalCases },
      { label: 'Success Rate', value: `${formatPercent(data.successRate)}` },
      { label: 'Return Rate', value: `${formatPercent(data.returnRate)}` },
      { label: 'Revision Success Rate', value: `${formatPercent(data.revisionSuccessRate)}` }
    ];
    
    metrics.forEach(metric => {
      checkAndAddPage(15);
      yPos += 10;
      doc.text(`${metric.label}: ${metric.value}`, margin + 10, yPos);
    });
    
    // Metric Averages Section
    checkAndAddPage(40);
    yPos += 25;
    doc.setFontSize(16);
    doc.text('Metric Averages', margin, yPos);
    
    // Average data
    yPos += 10;
    doc.setFontSize(12);
    const averages = [
      { label: 'Margins', value: formatNumber(data.metricAverages.margins) },
      { label: 'Contacts', value: formatNumber(data.metricAverages.contacts) },
      { label: 'Occlusion', value: formatNumber(data.metricAverages.occlusion) },
      { label: 'Color', value: formatNumber(data.metricAverages.color) },
      { label: 'Contour', value: formatNumber(data.metricAverages.contour) }
    ];
    
    averages.forEach(avg => {
      checkAndAddPage(15);
      yPos += 10;
      doc.text(`${avg.label} Average: ${avg.value}/2`, margin + 10, yPos);
    });
    
    // Return Breakdown Section
    checkAndAddPage(40);
    yPos += 25;
    doc.setFontSize(16);
    doc.text('Return Breakdown', margin, yPos);
    
    // Return data
    yPos += 10;
    doc.setFontSize(12);
    const returns = [
      { label: 'Margins', value: data.returnBreakdown.margins },
      { label: 'Contacts', value: data.returnBreakdown.contacts },
      { label: 'Occlusion', value: data.returnBreakdown.occlusion },
      { label: 'Color', value: data.returnBreakdown.color },
      { label: 'Contour', value: data.returnBreakdown.contour }
    ];
    
    returns.forEach(ret => {
      checkAndAddPage(15);
      yPos += 10;
      doc.text(`${ret.label}: ${ret.value} return${ret.value !== 1 ? 's' : ''}`, margin + 10, yPos);
    });
    
    // Score Distribution Section
    checkAndAddPage(40);
    yPos += 25;
    doc.setFontSize(16);
    doc.text('Score Distribution', margin, yPos);
    
    // Distribution data
    yPos += 10;
    doc.setFontSize(12);
    const metrics2 = ['margins', 'contacts', 'occlusion', 'color', 'contour'];
    
    metrics2.forEach(metric => {
      checkAndAddPage(30);
      yPos += 10;
      const capitalizedMetric = metric.charAt(0).toUpperCase() + metric.slice(1);
      const score0 = data.scoreDistribution[0][metric];
      const score1 = data.scoreDistribution[1][metric];
      const score2 = data.scoreDistribution[2][metric];
      const total = score0 + score1 + score2;
      
      doc.text(`${capitalizedMetric}:`, margin + 10, yPos);
      checkAndAddPage(25);
      yPos += 5;
      doc.text(`  Score 0: ${score0} (${((score0/total)*100).toFixed(1)}%)`, margin + 15, yPos);
      yPos += 5;
      doc.text(`  Score 1: ${score1} (${((score1/total)*100).toFixed(1)}%)`, margin + 15, yPos);
      yPos += 5;
      doc.text(`  Score 2: ${score2} (${((score2/total)*100).toFixed(1)}%)`, margin + 15, yPos);
    });

    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - margin, { align: 'right' });
    }
    
    // Save the PDF
    const fileName = `analytics_report_${selectedPeriod.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-blue-500 mr-4"
        >
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
        <h1 className="text-xl font-bold">Analytics</h1>

        <div className="ml-auto flex space-x-2">
          <div className="relative inline-block">
            <select
              value={selectedPeriod}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="bg-blue-500 text-white py-2 pl-4 pr-8 rounded-md appearance-none cursor-pointer"
            >
              {periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg
                className="w-4 h-4 fill-current text-white"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          <button
            onClick={generateReport}
            className="bg-blue-600 text-white py-2 px-4 rounded-md flex items-center"
          >
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="flex flex-wrap -mx-2 mb-6">
        <div className="w-full px-2 mb-4">
          <div className="bg-black rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Overall score */}
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold">Overall Score</h3>
                  <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                    ?
                  </div>
                </div>
                <p className="text-3xl font-bold">
                  {formatNumber(data.overallScore)}/2
                </p>
              </div>

              {/* Total cases */}
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold">Total Cases</h3>
                  <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                    ?
                  </div>
                </div>
                <p className="text-3xl font-bold">{data.totalCases}</p>
              </div>

              {/* Success rate */}
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold">Success Rate</h3>
                  <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                    ?
                  </div>
                </div>
                <p className="text-3xl font-bold">
                  {formatPercent(data.successRate)}
                </p>
              </div>

              {/* Return rate */}
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold">Return Rate</h3>
                  <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                    ?
                  </div>
                </div>
                <p className="text-3xl font-bold">
                  {formatPercent(data.returnRate)}
                </p>
              </div>

              {/* Revision success rate */}
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold">Revision Success Rate</h3>
                  <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                    ?
                  </div>
                </div>
                <p className="text-3xl font-bold">
                  {formatPercent(data.revisionSuccessRate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts - Top row */}
      <div className="flex flex-wrap -mx-2 mb-6">
        {/* Metric trends */}
        <div className="w-full md:w-1/2 px-2 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Metric Trends</h3>
              
            </div>

            {/* Metric toggles */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => toggleMetric('overall')}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                  visibleMetrics.overall
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                Overall
              </button>
              <button
                onClick={() => toggleMetric('margins')}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                  visibleMetrics.margins
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                Margins
              </button>
              <button
                onClick={() => toggleMetric('contacts')}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                  visibleMetrics.contacts
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                Contacts
              </button>
              <button
                onClick={() => toggleMetric('occlusion')}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                  visibleMetrics.occlusion
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                Occlusion
              </button>
              <button
                onClick={() => toggleMetric('color')}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                  visibleMetrics.color
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-red-400"></div>
                Color
              </button>
              <button
                onClick={() => toggleMetric('contour')}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                  visibleMetrics.contour
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-green-200"></div>
                Contour
              </button>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    interval="preserveStartEnd"
                    angle={selectedPeriod === "1 month" ? 0 : -45}
                    textAnchor="end"
                    height={60}
                    tick={{fontSize: 12}}
                  />
                  <YAxis domain={[0, 2]} />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value.toFixed(2)}/2`, 
                      name.charAt(0).toUpperCase() + name.slice(1)
                    ]}
                    labelFormatter={(label) => `${label} (${metricTrendsData.find(d => d.name === label)?.count || 0} cases)`}
                  />
                  {visibleMetrics.overall && (
                    <Line
                      type="monotone"
                      dataKey="overall"
                      stroke="#9c92ff"
                      activeDot={{ r: 8 }}
                      name="Overall"
                    />
                  )}
                  {visibleMetrics.margins && (
                    <Line 
                      type="monotone" 
                      dataKey="margins" 
                      stroke="#6192ff"
                      name="Margins"
                    />
                  )}
                  {visibleMetrics.contacts && (
                    <Line 
                      type="monotone" 
                      dataKey="contacts" 
                      stroke="#41d693"
                      name="Contacts"
                    />
                  )}
                  {visibleMetrics.occlusion && (
                    <Line 
                      type="monotone" 
                      dataKey="occlusion" 
                      stroke="#ffbb33"
                      name="Occlusion"
                    />
                  )}
                  {visibleMetrics.color && (
                    <Line 
                      type="monotone" 
                      dataKey="color" 
                      stroke="#ff6b6b"
                      name="Color"
                    />
                  )}
                  {visibleMetrics.contour && (
                    <Line 
                      type="monotone" 
                      dataKey="contour" 
                      stroke="#a8e6cf"
                      name="Contour"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Success rate trend */}
        <div className="w-full md:w-1/2 px-2 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Success Rate Trend</h3>
              
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={successRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    interval="preserveStartEnd"
                    angle={selectedPeriod === "1 month" ? 0 : -45}
                    textAnchor="end"
                    height={60}
                    tick={{fontSize: 12}}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Success Rate']}
                    labelFormatter={(label) => `${label} (${successRateData.find(d => d.name === label)?.count || 0} cases)`}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#4CAF50"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                    name="Success Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Metric averages */}
      <div className="mb-6 p-4 bg-green-50 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Margin AVG */}
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold">Margin AVG</h3>
              <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                ?
              </div>
            </div>
            <p className="text-3xl font-bold">
              {formatNumber(data.metricAverages.margins)}/2
            </p>
          </div>

          {/* Contact AVG */}
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold">Contact AVG</h3>
              <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                ?
              </div>
            </div>
            <p className="text-3xl font-bold">
              {formatNumber(data.metricAverages.contacts)}/2
            </p>
          </div>

          {/* Occlusion AVG */}
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold">Occlusion AVG</h3>
              <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                ?
              </div>
            </div>
            <p className="text-3xl font-bold">
              {formatNumber(data.metricAverages.occlusion)}/2
            </p>
          </div>

          {/* Color AVG */}
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold">Color AVG</h3>
              <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                ?
              </div>
            </div>
            <p className="text-3xl font-bold">
              {formatNumber(data.metricAverages.color)}/2
            </p>
          </div>

          {/* Contour AVG */}
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold">Contour AVG</h3>
              <div className="text-blue-500 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                ?
              </div>
            </div>
            <p className="text-3xl font-bold">
              {formatNumber(data.metricAverages.contour)}/2
            </p>
          </div>
        </div>
      </div>

      {/* Charts - Bottom row */}
      <div className="flex flex-wrap -mx-2 mb-6">
        {/* Return breakdown */}
        <div className="w-full md:w-1/2 px-2 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Return Breakdown</h3>
              
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {Object.values(data.returnBreakdown).every(val => val === 0) ? (
                  // Show message when no returns exist
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No returns in selected period
                  </div>
                ) : (
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Margins",
                          value: data.returnBreakdown.margins,
                          color: "#6192ff",
                        },
                        {
                          name: "Contacts",
                          value: data.returnBreakdown.contacts,
                          color: "#41d693",
                        },
                        {
                          name: "Occlusion",
                          value: data.returnBreakdown.occlusion,
                          color: "#ffbb33",
                        },
                        {
                          name: "Color",
                          value: data.returnBreakdown.color,
                          color: "#ff6b6b",
                        },
                        {
                          name: "Contour",
                          value: data.returnBreakdown.contour,
                          color: "#a8e6cf",
                        },
                      ].filter(item => item.value > 0)} // Only show metrics with returns
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                    >
                      {data.returnBreakdown && Object.values(data.returnBreakdown).some(val => val > 0) &&
                        [
                          { name: "Margins", color: "#6192ff" },
                          { name: "Contacts", color: "#41d693" },
                          { name: "Occlusion", color: "#ffbb33" },
                          { name: "Color", color: "#ff6b6b" },
                          { name: "Contour", color: "#a8e6cf" },
                        ]
                          .filter(item => data.returnBreakdown[item.name.toLowerCase()] > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))
                      }
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} return${value !== 1 ? 's' : ''}`,
                        name
                      ]}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value, entry) => {
                        const item = entry.payload;
                        return [
                          <span style={{ color: item.color }}>
                            {value}: {item.value} return{item.value !== 1 ? 's' : ''}
                          </span>,
                          null
                        ];
                      }}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Score distribution */}
        <div className="w-full md:w-1/2 px-2 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Score Distribution</h3>
              
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={scoreDistributionData}
                  layout="vertical"
                  margin={{
                    top: 20,
                    right: 30,
                    left: 60,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const total = props.payload.total;
                      const percentage = ((value / total) * 100).toFixed(1);
                      return [`${value} cases (${percentage}%)`, name];
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="Score 0" 
                    stackId="a" 
                    fill="#ff6b6b" 
                    name="Failure"
                  >
                    <LabelList 
                      dataKey="Score 0" 
                      position="center"
                      formatter={(value) => (value > 0 ? value : '')}
                      style={{ fill: 'white', fontSize: '12px' }}
                    />
                  </Bar>
                  <Bar 
                    dataKey="Score 1" 
                    stackId="a" 
                    fill="#ffbb33"
                    name="Significant Adjustment"
                  >
                    <LabelList 
                      dataKey="Score 1" 
                      position="center"
                      formatter={(value) => (value > 0 ? value : '')}
                      style={{ fill: 'white', fontSize: '12px' }}
                    />
                  </Bar>
                  <Bar 
                    dataKey="Score 2" 
                    stackId="a" 
                    fill="#41d693"
                    name="No/Slight Adjustment"
                  >
                    <LabelList 
                      dataKey="Score 2" 
                      position="center"
                      formatter={(value) => (value > 0 ? value : '')}
                      style={{ fill: 'white', fontSize: '12px' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Score Distribution Chart */}

    </div>
  );
}
