import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeftIcon, BuildingOfficeIcon, ClockIcon, CpuChipIcon, ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CompanyDetails = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [companyDetails, setCompanyDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const companyName = location.state?.companyName;
    const fromAnalytics = location.state?.fromAnalytics;

    const urlParams = new URLSearchParams(location.search);
    const companyNameFromParams = urlParams.get('name');
    const modelFromParams = urlParams.get('model');

    useEffect(() => {
        const fetchCompanyDetails = async () => {
            if (!id) return;

            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`http://localhost:3001/api/company-analytics/${id}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setCompanyDetails(data?.data || null);
            } catch (err) {
                console.error('Error fetching company details:', err);
                setError(err.message);
                setCompanyDetails(null);
            } finally {
                setLoading(false);
            }
        };

        fetchCompanyDetails();
    }, [id]);

    const handleGoBack = () => {
        if (fromAnalytics) {
            navigate(-1);
        } else {
            navigate('/analytics');
        }
    };

    // Enhanced chart data configuration
    const getChartData = () => {
        if (!companyDetails) return {};

        const performanceScore = Math.floor(Math.random() * 100) + 1;
        const responseTime = Math.min(companyDetails.latency_ms / 1000, 10);
        const employeeScore = Math.min((parseInt(companyDetails.number_of_employees) || 0) / 10, 100);

        return {
            labels: ['Performance', 'Response Time', 'Team Size'],
            datasets: [
                {
                    label: 'Company Metrics',
                    data: [performanceScore, responseTime * 10, employeeScore],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.1)',
                        'rgba(16, 185, 129, 0.1)',
                        'rgba(245, 158, 11, 0.1)',
                    ],
                    borderColor: [
                        'rgb(99, 102, 241)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                },
            ],
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                cornerRadius: 8,
                padding: 12,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#6b7280',
                    font: {
                        size: 12,
                    },
                },
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#6b7280',
                    font: {
                        size: 12,
                    },
                },
            },
        },
        elements: {
            bar: {
                borderWidth: 2,
            },
        },
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-100 border-t-indigo-600 mx-auto"></div>
                        <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-transparent border-r-purple-300 animate-ping mx-auto"></div>
                    </div>
                    <p className="mt-6 text-xl text-slate-600 font-medium">Loading company insights...</p>
                </div>
            </div>
        );
    }

    if (error || !companyDetails) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-rose-50 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-3">Company Not Found</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        {error ? `Error: ${error}` : 'The requested company details could not be found.'}
                    </p>
                    <button
                        onClick={handleGoBack}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-2" />
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Modern Header with Glass Effect */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <button
                            onClick={handleGoBack}
                            className="inline-flex items-center px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm text-slate-700 font-medium rounded-xl hover:bg-white hover:shadow-md transition-all duration-200"
                        >
                            <ArrowLeftIcon className="h-4 w-4 mr-2" />
                            Back
                        </button>

                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-lg font-bold text-white">
                                    {companyDetails.company_name?.charAt(0) || 'C'}
                                </span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">
                                    {companyDetails.company_name}
                                </h1>
                                <p className="text-sm text-slate-500 font-medium">Company Analysis Dashboard</p>
                            </div>
                        </div>

                        <div className="w-24"></div>
                    </div>
                </div>
            </div>

            {/* Hero Section with Key Metrics */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    {/* Analysis ID Card */}
                    <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center">
                                    <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Analysis ID</h3>
                            <p className="text-lg font-bold text-slate-800 truncate">{companyDetails.uuid.slice(0, 12)}...</p>
                        </div>
                    </div>

                    {/* Response Time Card */}
                    <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center">
                                    <ClockIcon className="h-6 w-6 text-emerald-600" />
                                </div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                    Fast
                                </span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Response Time</h3>
                            <p className="text-2xl font-bold text-slate-800">
                                {(() => {
                                    const ms = companyDetails.latency_ms;
                                    if (ms < 1000) return `${ms}ms`;
                                    const totalSeconds = Math.floor(ms / 1000);
                                    if (totalSeconds < 60) return `${totalSeconds}s`;
                                    const minutes = Math.floor(totalSeconds / 60);
                                    const seconds = totalSeconds % 60;
                                    return `${minutes}m ${seconds}s`;
                                })()}
                            </p>
                        </div>
                    </div>

                    {/* Visual Dashboard Link Card */}
                    <div
                        onClick={() => navigate(`/company-details2/${id}`, { state: { companyName: companyDetails?.company_name } })}
                        className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-indigo-100 hover:border-indigo-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 rounded-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                                    <ChartBarIcon className="h-6 w-6 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                </div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                    View Dashboard
                                </span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 group-hover:text-indigo-600">Strategic View</h3>
                            <p className="text-lg font-bold text-slate-800 group-hover:text-indigo-700">Open Visuals &rarr;</p>
                        </div>
                    </div>

                    {/* Date Card */}
                    <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
                                    <CalendarIcon className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Generated</h3>
                            <p className="text-sm font-bold text-slate-800">
                                {new Date(companyDetails.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Performance Chart - Takes 1/3 width */}
                    {/* Company Voice - Takes 1/3 width */}
                    <div className="xl:col-span-1">
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50 h-full">
                            <div className="flex items-center mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center mr-3">
                                    <ChartBarIcon className="h-5 w-5 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Company Voice</h3>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                {companyDetails?.reviews ? (
                                    (() => {
                                        const lines = companyDetails.reviews
                                            .split('\n')
                                            .filter(line => line.trim());

                                        return lines.map((line, index) => {
                                            const checkmarkMatch = line.match(/(.*?)[✅✓]\s*(.+)/);

                                            if (checkmarkMatch) {
                                                const [, issue, solution] = checkmarkMatch;

                                                return (
                                                    <div
                                                        key={index}
                                                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                                                    >
                                                        {/* Issue Header */}
                                                        <div className="bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3 border-b border-red-100">
                                                            <div className="flex items-start">
                                                                <span className="text-red-500 text-lg mr-2">⚠️</span>
                                                                <p className="text-sm font-semibold text-slate-800 leading-relaxed flex-1">
                                                                    {issue.trim()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Solution Body */}
                                                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3">
                                                            <div className="flex items-start">
                                                                <span className="text-emerald-500 text-base mr-2">✓</span>
                                                                <p className="text-xs font-medium text-slate-700 leading-relaxed flex-1">
                                                                    {solution.trim()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={index}
                                                    className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-200"
                                                >
                                                    <p className="text-sm text-slate-600 leading-relaxed">
                                                        {line.trim()}
                                                    </p>
                                                </div>
                                            );
                                        });
                                    })()
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center">
                                        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-4">
                                            <ChartBarIcon className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <p className="text-slate-500 font-medium">No reviews available</p>
                                        <p className="text-sm text-slate-400 mt-1">Reviews will appear here once analyzed</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Content Area - Takes 2/3 width */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* AI Analysis Report */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6 border-b border-slate-200">
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">AI Analysis Report</h2>
                                <p className="text-slate-600">Comprehensive business intelligence and insights</p>
                            </div>
                            <div className="p-8 max-h-96 overflow-y-auto custom-scrollbar">
                                <div className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-strong:text-slate-700">
                                    <ReactMarkdown>
                                        {companyDetails?.analysis || 'No analysis available'}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Company Information */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-50 to-indigo-50 px-8 py-6 border-b border-slate-200">
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">Company Information</h3>
                                <p className="text-slate-600">Key business details and metrics</p>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {companyDetails.number_of_employees && (
                                        <div className="group">
                                            <div className="flex items-center mb-3">
                                                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mr-3"></div>
                                                <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Team Size</dt>
                                            </div>
                                            <div className="text-2xl font-bold text-slate-800">{companyDetails.number_of_employees} employees</div>
                                        </div>
                                    )}
                                    {companyDetails.company_gstin && (
                                        <div className="group">
                                            <div className="flex items-center mb-3">
                                                <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full mr-3"></div>
                                                <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wider">GSTIN Number</dt>
                                            </div>
                                            <dd className="text-lg font-bold text-slate-800 font-mono bg-slate-100 px-3 py-2 rounded-lg inline-block">
                                                {companyDetails.company_gstin}
                                            </dd>
                                        </div>
                                    )}
                                </div>
                                {companyDetails.company_details && (
                                    <div className="mt-8 pt-8 border-t border-slate-200 max-h-96 overflow-y-auto custom-scrollbar">
                                        <div className="flex items-center mb-4">
                                            <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mr-3"></div>
                                            <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Company Details</dt>
                                        </div>
                                        <dd className="text-slate-700 leading-relaxed">
                                            <div className="prose prose-slate max-w-none">
                                                <ReactMarkdown>
                                                    {companyDetails.company_details}
                                                </ReactMarkdown>
                                            </div>
                                        </dd>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default CompanyDetails;
