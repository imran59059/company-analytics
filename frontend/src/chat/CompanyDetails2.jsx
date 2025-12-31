import { useEffect, useState } from "react"
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts"
import { AlertCircle, CheckCircle2, X } from "lucide-react"
import { useParams } from "react-router-dom";

export default function CultureDiagnosisPager() {
    const { id } = useParams();
    const [activeMetric, setActiveMetric] = useState("Revenue/Emp")
    const [selectedCultureDimension, setSelectedCultureDimension] = useState(null)
    const [companyDetails, setCompanyDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const defaultYoyTrendingData = {
        "Revenue/Emp": [
            { year: "2021", codeclouds: 65, industry: 85 },
            { year: "2022", codeclouds: 72, industry: 90 },
            { year: "2023", codeclouds: 78, industry: 95 },
            { year: "2024", codeclouds: 82, industry: 98 },
            { year: "2025", codeclouds: 85, industry: 100 },
        ],
        "Profit/Emp": [
            { year: "2021", codeclouds: 58, industry: 85 },
            { year: "2022", codeclouds: 65, industry: 88 },
            { year: "2023", codeclouds: 70, industry: 92 },
            { year: "2024", codeclouds: 75, industry: 96 },
            { year: "2025", codeclouds: 78, industry: 100 },
        ],
        Retention: [
            { year: "2021", codeclouds: 72, industry: 85 },
            { year: "2022", codeclouds: 75, industry: 86 },
            { year: "2023", codeclouds: 78, industry: 88 },
            { year: "2024", codeclouds: 80, industry: 89 },
            { year: "2025", codeclouds: 82, industry: 90 },
        ],
        Turnover: [
            { year: "2021", codeclouds: 28, industry: 15 },
            { year: "2022", codeclouds: 25, industry: 14 },
            { year: "2023", codeclouds: 22, industry: 13 },
            { year: "2024", codeclouds: 20, industry: 12.5 },
            { year: "2025", codeclouds: 18, industry: 12 },
        ],
    }

    const defaultMetricInsights = {
        "Revenue/Emp": {
            status: "Improving",
            current: "85 vs 100 (industry)",
            gap: "15% below industry",
            insight:
                "CodeClouds is closing the gap rapidly (85% of industry benchmark). Strong 5-year trajectory shows 30% improvement. Still lagging in revenue efficiency — opportunity to optimize resource allocation and project delivery.",
            color: "amber",
        },
        "Profit/Emp": {
            status: "Lagging",
            current: "78 vs 100 (industry)",
            gap: "22% below industry",
            insight:
                "Profit per employee is the weakest metric. While revenue is improving, profitability lags due to higher operational costs. Focus on margin optimization and operational efficiency to close this gap.",
            color: "red",
        },
        Retention: {
            status: "Competitive",
            current: "82% vs 90% (industry)",
            gap: "8% below industry",
            insight:
                "Retention is competitive but not leading. CodeClouds retains 82% of employees vs 90% industry average. Recognition and career growth gaps are primary drivers of the 8% gap.",
            color: "amber",
        },
        Turnover: {
            status: "Concerning",
            current: "18% vs 12% (industry)",
            gap: "50% higher than industry",
            insight:
                "Turnover is significantly elevated at 18% vs 12% industry average. This is the most critical metric — 50% higher than peers. Early-tenure employees (0-3 years) represent 70% of exits.",
            color: "red",
        },
    }

    const defaultCultureData = [
        { dimension: "Recognition", codeclouds: 6.2, industry: 7.5 },
        { dimension: "Manager Rel.", codeclouds: 6.8, industry: 7.8 },
        { dimension: "Leadership", codeclouds: 7.1, industry: 8.0 },
        { dimension: "Psych Safety", codeclouds: 6.5, industry: 7.2 },
        { dimension: "Career Growth", codeclouds: 5.9, industry: 7.6 },
        { dimension: "Work-Life", codeclouds: 7.2, industry: 7.4 },
        { dimension: "Communication", codeclouds: 6.9, industry: 7.7 },
    ]

    const defaultAttritionData = [
        { tenure: "0-1yr", count: 24, reason: "Growth" },
        { tenure: "1-3yr", count: 18, reason: "Manager" },
        { tenure: "3-5yr", count: 12, reason: "Pay" },
        { tenure: "5+yr", count: 8, reason: "Culture" },
    ]

    const defaultRoiData = [
        { lever: "Baseline PAT", value: 100 },
        { lever: "Turnover Reduction", value: 28 },
        { lever: "Productivity Uplift", value: 35 },
        { lever: "Projected PAT", value: 163 },
    ]

    const COLORS = ["#8b5cf6", "#6366f1", "#ec4899", "#f59e0b"]

    const defaultEmployeeFeedbackData = {
        Recognition: {
            gap: "6.2/10 vs 7.5 industry",
            comments: [
                {
                    source: "Glassdoor",
                    rating: 3,
                    text: "Good company but recognition is lacking. You can work hard for months and no one acknowledges it. Managers don't celebrate wins.",
                    author: "Former Senior Developer",
                },
                {
                    source: "Indeed",
                    rating: 2,
                    text: "Recognition is minimal. Promotions feel arbitrary and there's no clear path to advancement. Peers at other companies get way more acknowledgment.",
                    author: "Former Product Manager",
                },
                {
                    source: "Glassdoor",
                    rating: 3,
                    text: "The company does annual bonuses but day-to-day recognition is almost non-existent. No peer recognition program or shout-outs.",
                    author: "Former QA Engineer",
                },
            ],
        },
        "Career Growth": {
            gap: "5.9/10 vs 7.6 industry",
            comments: [
                {
                    source: "Indeed",
                    rating: 2,
                    text: "Limited career progression. I was stuck in the same role for 3 years with no clear growth path. Moved to a competitor with better opportunities.",
                    author: "Former Senior Engineer",
                },
                {
                    source: "Glassdoor",
                    rating: 3,
                    text: "Career development is unclear. No mentorship program or structured learning paths. You have to figure it out yourself.",
                    author: "Former Analyst",
                },
                {
                    source: "Indeed",
                    rating: 2,
                    text: "Growth opportunities are limited unless you're in management track. Individual contributors hit a ceiling quickly.",
                    author: "Former Technical Lead",
                },
            ],
        },
        Communication: {
            gap: "6.9/10 vs 7.7 industry",
            comments: [
                {
                    source: "Glassdoor",
                    rating: 3,
                    text: "Communication between teams is poor. Left hand doesn't know what right hand is doing. Too many silos.",
                    author: "Former Product Designer",
                },
                {
                    source: "Indeed",
                    rating: 3,
                    text: "Leadership communication is sparse. Big decisions are announced without context. Feels like we're always out of the loop.",
                    author: "Former Operations Manager",
                },
                {
                    source: "Glassdoor",
                    rating: 3,
                    text: "Internal comms could be better. Lots of redundant meetings but key information still gets lost.",
                    author: "Former Business Analyst",
                },
            ],
        },
        Leadership: {
            gap: "7.1/10 vs 8.0 industry",
            comments: [
                {
                    source: "Indeed",
                    rating: 3,
                    text: "Leadership is decent but inconsistent. Some managers are great, others are hands-off. No unified leadership philosophy.",
                    author: "Former Team Lead",
                },
                {
                    source: "Glassdoor",
                    rating: 3,
                    text: "Senior leadership is disconnected from day-to-day work. They don't understand the challenges we face on the ground.",
                    author: "Former Developer",
                },
                {
                    source: "Indeed",
                    rating: 3,
                    text: "Leadership changes direction too often. Hard to build momentum when priorities shift every quarter.",
                    author: "Former Project Manager",
                },
            ],
        },
        "Manager Rel.": {
            gap: "6.8/10 vs 7.8 industry",
            comments: [
                {
                    source: "Glassdoor",
                    rating: 3,
                    text: "Manager relationship is hit or miss. My manager was great but I've heard horror stories from peers. No consistency.",
                    author: "Former Software Engineer",
                },
                {
                    source: "Indeed",
                    rating: 2,
                    text: "Managers lack training. Mine had no idea how to handle conflicts or give constructive feedback. Very frustrating.",
                    author: "Former Support Specialist",
                },
                {
                    source: "Glassdoor",
                    rating: 3,
                    text: "1-on-1s are sporadic. My manager was too busy to meet regularly. Felt like I was on my own.",
                    author: "Former Content Writer",
                },
            ],
        },
        "Psych Safety": {
            gap: "6.5/10 vs 7.2 industry",
            comments: [
                {
                    source: "Indeed",
                    rating: 3,
                    text: "Psychological safety is okay but not great. People are cautious about speaking up in meetings. Fear of judgment.",
                    author: "Former UX Researcher",
                },
                {
                    source: "Glassdoor",
                    rating: 3,
                    text: "You can share ideas but there's an underlying pressure to always be right. Mistakes are not handled well.",
                    author: "Former Data Analyst",
                },
                {
                    source: "Indeed",
                    rating: 3,
                    text: "Some teams are safe, others are toxic. Depends entirely on your manager and team composition.",
                    author: "Former HR Coordinator",
                },
            ],
        },
        "Work-Life": {
            gap: "7.2/10 vs 7.4 industry",
            comments: [
                {
                    source: "Glassdoor",
                    rating: 4,
                    text: "Work-life balance is actually pretty good here. Flexible hours and remote work options. Rarely expected to work weekends.",
                    author: "Former Senior Manager",
                },
                {
                    source: "Indeed",
                    rating: 4,
                    text: "One of the best things about CodeClouds is the work-life balance. They respect your time off.",
                    author: "Former Developer",
                },
                {
                    source: "Glassdoor",
                    rating: 4,
                    text: "Great benefits and flexible schedule. Management doesn't expect you to be always-on. Refreshing compared to other tech companies.",
                    author: "Former Product Owner",
                },
            ],
        },
    };

    const defaultCompanyStats = {
        employees: "1,240",
        revenue: "₹245M",
        turnover: "18%",
        avg_tenure: "4.2 yrs"
    };
    const defaultExecutiveSummary = {
        text: "CodeClouds shows strong financial performance but faces cultural headwinds in recognition and career growth. Strategic interventions can unlock a ",
        highlight: "21% PAT improvement"
    };

    // ------------------- DYNAMIC DATA LOGIC -------------------
    const dashboardData = companyDetails?.dashboard_data
        ? (typeof companyDetails.dashboard_data === 'string' ? JSON.parse(companyDetails.dashboard_data) : companyDetails.dashboard_data)
        : null;

    const companyStats = dashboardData?.companyStats || defaultCompanyStats;
    const executiveSummary = dashboardData?.executiveSummary || defaultExecutiveSummary;

    // Normalizers to map specific AI keys to Component keys
    const normalizeYoy = (data) => {
        if (!data) return null;
        const res = {};
        Object.keys(data).forEach(k => {
            res[k] = data[k].map(i => ({ ...i, codeclouds: i.company_score ?? i.codeclouds, industry: i.industry_score ?? i.industry }));
        });
        return res;
    };
    const normalizeCulture = (data) => data?.map(i => ({ ...i, codeclouds: i.company_score ?? i.codeclouds, industry: i.industry_score ?? i.industry }));

    const yoyTrendingData = normalizeYoy(dashboardData?.yoyTrendingData) || defaultYoyTrendingData;
    const metricInsights = dashboardData?.metricInsights || defaultMetricInsights;
    const cultureData = normalizeCulture(dashboardData?.cultureData) || defaultCultureData;
    const attritionData = dashboardData?.attritionData || defaultAttritionData;
    const roiData = dashboardData?.roiData || defaultRoiData;
    const employeeFeedbackData = dashboardData?.employeeFeedbackData || defaultEmployeeFeedbackData;

    const bubbleChartData = cultureData.map((item) => ({
        x: item.codeclouds,
        y: item.industry,
        z: Math.abs(item.industry - item.codeclouds) * 50 + 100,
        name: item.dimension,
        codeclouds: item.codeclouds,
        industry: item.industry,
    }))

    useEffect(() => {
        console.warn('Useeffect called...1');
        const fetchCompanyDetails = async () => {
            console.warn('Useeffect called...2');
            if (!id) return;

            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`http://localhost:3001/api/company-analytics/${id}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log({ response });
                setCompanyDetails(data?.data || null);
            } catch (err) {
                console.error('Error fetching company details:', err);
                setError(err.message);
                setCompanyDetails(null);
            } finally {
                setLoading(false);
            }
        };

        console.warn('Useeffect called...3');
        fetchCompanyDetails();
    }, [id]);

    console.log({ companyDetails });

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-slate-950/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {companyDetails?.company_name}
                        </h1>
                        <p className="text-sm text-purple-300">Culture + Performance Diagnostic</p>
                    </div>
                    <div className="text-right text-sm text-purple-300">
                        <p>October 2025</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
                {/* Section 1: Executive Summary */}
                <section className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h2 className="text-4xl font-bold text-white">
                                Culture Diagnosis:{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                    Key Findings
                                </span>
                            </h2>
                            <p className="text-lg text-purple-200 leading-relaxed">
                                {executiveSummary.text}{" "}
                                <span className="font-bold text-amber-400">{executiveSummary.highlight}</span> within 12 months.
                            </p>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                                <p className="text-sm text-purple-300 mb-1">Employees</p>
                                <p className="text-2xl font-bold">{companyStats.employees}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                                <p className="text-sm text-purple-300 mb-1">Revenue (FY)</p>
                                <p className="text-2xl font-bold">{companyStats.revenue}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                                <p className="text-sm text-purple-300 mb-1">Turnover Rate</p>
                                <p className="text-2xl font-bold text-red-400">{companyStats.turnover || companyStats.turnover_rate}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                                <p className="text-sm text-purple-300 mb-1">Avg Tenure</p>
                                <p className="text-2xl font-bold">{companyStats.avg_tenure}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Benchmark Comparison */}
                <section className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Performance vs Industry Benchmarks</h3>
                        <p className="text-purple-300">5-Year Y-o-Y Trending: CodeClouds closing the gap with industry leaders</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {Object.keys(yoyTrendingData).map((metric) => {
                            const insight = metricInsights[metric]
                            const isActive = activeMetric === metric
                            return (
                                <div
                                    key={metric}
                                    onMouseEnter={() => setActiveMetric(metric)}
                                    className={`transition-all duration-300 rounded-lg p-5 cursor-pointer ${isActive
                                        ? "bg-gradient-to-br from-purple-500/30 to-purple-600/20 border-2 border-purple-400 shadow-lg shadow-purple-500/20"
                                        : "bg-slate-900/50 border border-purple-500/20 hover:border-purple-500/40"
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="text-lg font-semibold text-white">{metric}</h4>
                                        <span
                                            className={`text-xs font-bold px-2 py-1 rounded-full ${insight.color === "red" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                                                }`}
                                        >
                                            {insight.status}
                                        </span>
                                    </div>

                                    <ResponsiveContainer width="100%" height={180}>
                                        <LineChart data={yoyTrendingData[metric]}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" />
                                            <XAxis dataKey="year" stroke="#a78bfa" style={{ fontSize: "12px" }} />
                                            <YAxis stroke="#a78bfa" style={{ fontSize: "12px" }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: "#1e1b4b", border: "1px solid #8b5cf6" }}
                                                labelStyle={{ color: "#e9d5ff" }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                                            <Line
                                                type="monotone"
                                                dataKey="codeclouds"
                                                stroke="#8b5cf6"
                                                name="CodeClouds"
                                                strokeWidth={3}
                                                dot={{ fill: "#8b5cf6", r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="industry"
                                                stroke="#6366f1"
                                                name="Industry Avg"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={{ fill: "#6366f1", r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>

                                    <div className="mt-4 pt-4 border-t border-purple-500/20 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-purple-300">Current Performance:</span>
                                            <span className="font-semibold text-white">{insight.current}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-purple-300">Gap vs Industry:</span>
                                            <span className={`font-semibold ${insight.color === "red" ? "text-red-400" : "text-amber-400"}`}>
                                                {insight.gap}
                                            </span>
                                        </div>
                                        <p className="text-xs text-purple-200 leading-relaxed mt-3">{insight.insight}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Section 3: Cultural Dimensions Analysis - BUBBLE CHART */}
                <section className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Cultural Dimensions Analysis</h3>
                        <p className="text-purple-300">Click on any bubble to see what employees are saying about that dimension</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Bubble Chart */}
                        <div className="md:col-span-2 bg-slate-900/50 border border-purple-500/20 rounded-lg p-8">
                            <ResponsiveContainer width="100%" height={350}>
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" />
                                    <XAxis
                                        type="number"
                                        dataKey="codeclouds"
                                        name="CodeClouds Score"
                                        stroke="#a78bfa"
                                        label={{ value: "CodeClouds Score", position: "insideBottomRight", offset: -5 }}
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="industry"
                                        name="Industry Avg"
                                        stroke="#a78bfa"
                                        label={{ value: "Industry Average", angle: -90, position: "insideLeft" }}
                                    />
                                    <Tooltip
                                        cursor={{ strokeDasharray: "3 3" }}
                                        contentStyle={{ backgroundColor: "#1e1b4b", border: "1px solid #8b5cf6" }}
                                        labelStyle={{ color: "#e9d5ff" }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload[0]) {
                                                const data = payload[0].payload
                                                return (
                                                    <div className="bg-slate-900 border border-purple-400 rounded p-2 text-xs">
                                                        <p className="font-semibold text-purple-300">{data.name}</p>
                                                        <p className="text-purple-200">CodeClouds: {data.codeclouds}/10</p>
                                                        <p className="text-purple-200">Industry: {data.industry}/10</p>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Scatter
                                        name="Cultural Dimensions"
                                        data={bubbleChartData}
                                        fill="#8b5cf6"
                                        onClick={(data) => setSelectedCultureDimension(data.name)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        {bubbleChartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={selectedCultureDimension === entry.name ? "#ec4899" : "#8b5cf6"}
                                                opacity={selectedCultureDimension === entry.name ? 1 : 0.7}
                                            />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                            <p className="text-xs text-purple-300 mt-4 text-center">Bubble size represents gap magnitude</p>
                        </div>

                        {/* Employee Feedback Panel */}
                        <div className="space-y-4">
                            {selectedCultureDimension ? (
                                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="text-lg font-bold text-white">{selectedCultureDimension}</h4>
                                            <p className="text-xs text-purple-300 mt-1">
                                                {employeeFeedbackData[selectedCultureDimension]?.gap}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedCultureDimension(null)}
                                            className="text-purple-400 hover:text-purple-300"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {employeeFeedbackData[selectedCultureDimension]?.comments.map((comment, idx) => (
                                            <div key={idx} className="bg-slate-900/50 border border-purple-500/20 rounded p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-purple-400">{comment.source}</span>
                                                    <div className="flex gap-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span
                                                                key={i}
                                                                className={`text-xs ${i < comment.rating ? "text-amber-400" : "text-slate-600"}`}
                                                            >
                                                                ★
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-purple-200 leading-relaxed italic">"{comment.text}"</p>
                                                <p className="text-xs text-purple-400">— {comment.author}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 rounded-lg p-5 text-center space-y-3">
                                    <AlertCircle className="w-8 h-8 text-purple-400 mx-auto" />
                                    <p className="text-sm text-purple-300">
                                        Click on a bubble to see employee feedback from Glassdoor & Indeed
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Section 4: Attrition Anatomy */}
                <section className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Where People Leave & Why</h3>
                        <p className="text-purple-300">
                            Early-tenure employees (0-3 years) represent 70% of exits — growth and management issues
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-8">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={attritionData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" />
                                    <XAxis type="number" stroke="#a78bfa" />
                                    <YAxis dataKey="tenure" type="category" stroke="#a78bfa" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1e1b4b", border: "1px solid #8b5cf6" }}
                                        labelStyle={{ color: "#e9d5ff" }}
                                    />
                                    <Bar dataKey="count" fill="#ec4899" name="Exits" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top Reasons */}
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                                <p className="text-sm text-purple-300 mb-2">Top Reason: Growth Clarity</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-purple-900/50 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
                                            style={{ width: "68%" }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-semibold">68%</span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                                <p className="text-sm text-purple-300 mb-2">Manager Relationship</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-purple-900/50 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
                                            style={{ width: "52%" }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-semibold">52%</span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                                <p className="text-sm text-purple-300 mb-2">Compensation</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-purple-900/50 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
                                            style={{ width: "38%" }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-semibold">38%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 5: ROI & Business Case */}
                <section className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Path to 21% PAT Improvement</h3>
                        <p className="text-purple-300">Strategic interventions unlock ₹63M in incremental value</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-8">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={roiData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" />
                                    <XAxis dataKey="lever" stroke="#a78bfa" angle={-45} textAnchor="end" height={80} />
                                    <YAxis stroke="#a78bfa" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1e1b4b", border: "1px solid #8b5cf6" }}
                                        labelStyle={{ color: "#e9d5ff" }}
                                    />
                                    <Bar dataKey="value" fill="#8b5cf6" name="PAT Impact (₹M)">
                                        {roiData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* ROI Assumptions */}
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-green-300">Turnover Reduction</p>
                                        <p className="text-sm text-green-200">
                                            10% drop in voluntary exits = ₹28M saved (recruitment + ramp costs)
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-green-300">Productivity Uplift</p>
                                        <p className="text-sm text-green-200">3% revenue per employee increase = ₹35M incremental</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-lg p-4">
                                <p className="text-sm text-amber-300 font-semibold mb-2">Timeline: 0–12 months</p>
                                <p className="text-sm text-amber-200">
                                    Pilot (months 1–3) → Rollout (months 4–8) → Scale (months 9–12)
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 6: Wazo Solution Map */}
                <section className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Solution Roadmap: Problem → Feature → Impact</h3>
                        <p className="text-purple-300">Wazo features directly address identified cultural gaps</p>
                    </div>
                    <div className="space-y-3">
                        {[
                            {
                                problem: "Low Recognition",
                                feature: "Awards + Badges + Feed",
                                impact: "+12% retention",
                                timeline: "3–6 mo",
                            },
                            {
                                problem: "Poor Manager Feedback",
                                feature: "Anonymous Feedback + Pulse",
                                impact: "+8% engagement",
                                timeline: "1–3 mo",
                            },
                            {
                                problem: "Career Clarity Gap",
                                feature: "Journey + Analytics",
                                impact: "+15% internal mobility",
                                timeline: "6–12 mo",
                            },
                            {
                                problem: "Communication Gaps",
                                feature: "Feed + Announcements",
                                impact: "+10% trust score",
                                timeline: "1–2 mo",
                            },
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4 flex items-center justify-between"
                            >
                                <div className="flex-1">
                                    <p className="font-semibold text-white mb-1">{item.problem}</p>
                                    <p className="text-sm text-purple-300">{item.feature}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-green-400">{item.impact}</p>
                                    <p className="text-xs text-purple-300">{item.timeline}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 7: Next Steps */}
                <section className="space-y-6 pb-12">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Recommended Next Steps</h3>
                        <p className="text-purple-300">12-month implementation roadmap</p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-4">
                        {[
                            {
                                phase: "Phase 1",
                                title: "Pilot",
                                duration: "Months 1–3",
                                items: ["Awards launch", "Pulse surveys", "Manager training"],
                            },
                            {
                                phase: "Phase 2",
                                title: "Rollout",
                                duration: "Months 4–8",
                                items: ["Full platform", "Feedback loops", "Analytics setup"],
                            },
                            {
                                phase: "Phase 3",
                                title: "Measure",
                                duration: "Months 6–9",
                                items: ["Retention tracking", "Engagement scores", "ROI validation"],
                            },
                            {
                                phase: "Phase 4",
                                title: "Scale",
                                duration: "Months 9–12",
                                items: ["Optimization", "Advanced features", "Expansion"],
                            },
                        ].map((phase, idx) => (
                            <div
                                key={idx}
                                className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4"
                            >
                                <p className="text-xs font-bold text-purple-400 mb-1">{phase.phase}</p>
                                <p className="text-lg font-bold text-white mb-1">{phase.title}</p>
                                <p className="text-xs text-purple-300 mb-3">{phase.duration}</p>
                                <ul className="space-y-1">
                                    {phase.items.map((item, i) => (
                                        <li key={i} className="text-xs text-purple-200 flex gap-2">
                                            <span className="text-purple-400">•</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-purple-500/20 bg-slate-950/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-purple-300">
                    <p>CodeClouds Culture Diagnosis • October 2025 • Confidential</p>
                </div>
            </footer>
        </div>
    )
}
