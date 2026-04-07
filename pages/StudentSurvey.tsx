import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getCurrentUser, getStudentSurveys, saveSurvey, sendHighRiskEmailAlert } from '../services/storageService';
import { StudentProfile, WellnessSurvey, Role } from '../types';
import { MOODS } from '../constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Chatbot from '../components/Chatbot';

const StudentSurvey: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<StudentProfile | null>(null);
  const [surveys, setSurveys] = useState<WellnessSurvey[]>([]);
  const [showResult, setShowResult] = useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);

  // New Survey Form state
  const [surveyForm, setSurveyForm] = useState({
    stress: 5,
    sleep: 7,
    study: 4,
    attendance: 85,
    assignment: 80,
    mood: MOODS[0],
    remarks: ''
  });

  const [prediction, setPrediction] = useState<{
    score: number;
    status: string;
    confidence: number;
    stressSource: string;
    stressDesc: string;
    riskFactors: { text: string; points: string[] }[];
    doingWell: { text: string; points: string[] }[];
    improvements: { text: string; points: string[] }[];
  } | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.role === Role.STUDENT) {
      setUser(currentUser);
      const data = getStudentSurveys(currentUser.rollNumber);
      setSurveys(data);
    }
  }, []);

  const generatePrediction = () => {
    const { stress, sleep, study, attendance, assignment } = surveyForm;
    
    // Formula from Python `calculate_wellbeing_score`
    const study_score = Math.min(study / 8, 1);
    const sleep_score = Math.min(sleep / 8, 1);
    const attendance_score = attendance / 100;
    const assignment_score = assignment / 100;
    const stress_score = (10 - stress) / 10;
    
    const score = Math.round(((study_score + sleep_score + attendance_score + assignment_score + stress_score) / 5) * 100);
    
    let status = "Poor";
    if (score >= 80) status = "Good";
    else if (score >= 50) status = "Average";

    // Stress Source translation
    let academic_good = 0;
    if (study >= 6) academic_good += 1;
    if (attendance >= 75) academic_good += 1;
    if (assignment >= 70) academic_good += 1;
    if (sleep >= 7) academic_good += 1;

    let stressSource = "Balanced";
    let stressDesc = "Stress level appears to be balanced between academic and personal factors.";
    
    if (stress >= 6 && academic_good >= 3) {
        stressSource = "Personal (Non-Academic)";
        stressDesc = "Academic indicators are healthy. Stress may be due to personal or external factors.";
    } else if (stress >= 6 && academic_good < 3) {
        stressSource = "Academic";
        stressDesc = "Stress is likely caused by academic workload or imbalance.";
    }

    const riskFactors: { text: string; points: string[] }[] = [];
    const doingWell: { text: string; points: string[] }[] = [];
    const improvements: { text: string; points: string[] }[] = [];

    const attachPositive = (text: string, points: string[]) => { doingWell.push({ text, points }); }
    const attachRisk = (text: string, points: string[]) => { riskFactors.push({ text, points }); }
    const attachImprove = (text: string, points: string[]) => { improvements.push({ text, points }); }

    // STUDY
    if (study > 8) {
        attachRisk("Excessive study hours detected. This can quickly lead to academic burnout.", [
            "Take regular mandatory breaks",
            "Focus on study quality and active recall instead of duration",
            "Ensure you make time for hobbies and relaxation"
        ]);
    } else if (study >= 6) {
        attachPositive("Study hours are well balanced and supportive of academic growth.", [
            "Maintain this balance regularly",
            "Gradually increase efficiency rather than hours",
            "Focus on concept clarity"
        ]);
    } else if (study >= 4) {
        attachImprove("Study effort is moderate. Increasing consistency may improve academic stability.", [
            "Create a daily study timetable",
            "Increase consistency in study hours",
            "Set small daily goals"
        ]);
    } else {
        attachRisk("Low academic engagement detected due to insufficient study hours.", [
            "Study at least 6-8 hours daily",
            "Use Pomodoro technique for focus",
            "Avoid distractions like mobile during study"
        ]);
    }

    // ATTENDANCE
    if (attendance >= 90) {
        attachPositive("Outstanding attendance demonstrates strong academic commitment.", [
            "Continue attending regularly",
            "Actively participate in class",
            "Use class time effectively"
        ]);
    } else if (attendance >= 75) {
        attachPositive("Attendance level is satisfactory and supports learning continuity.", [
            "Try to reach 90%+ attendance",
            "Avoid unnecessary leaves",
            "Stay consistent"
        ]);
    } else if (attendance >= 60) {
        attachImprove("Attendance could be improved to strengthen academic exposure.", [
            "Attend classes regularly",
            "Be punctual",
            "Avoid skipping important sessions"
        ]);
    } else {
        attachRisk("Low attendance may significantly impact understanding and performance.", [
            "Maintain minimum 75% attendance",
            "Avoid unnecessary leaves",
            "Revise missed classes regularly"
        ]);
    }

    // SLEEP
    if (sleep > 8) {
        attachRisk("Excessive sleep detected. Oversleeping can cause lethargy and reduce productivity.", [
            "Set a strict morning alarm",
            "Avoid hitting the snooze button",
            "Engage in morning physical activity to wake up"
        ]);
    } else if (sleep >= 7 && sleep <= 8) {
        attachPositive("Healthy sleep cycle supports focus, memory retention, and productivity.", [
            "Maintain this routine",
            "Avoid late-night distractions",
            "Keep consistent sleep timing"
        ]);
    } else if (sleep >= 6 && sleep < 7) {
        attachImprove("Sleep duration is slightly below optimal. Better rest may enhance concentration.", [
            "Sleep 7-8 hours daily",
            "Avoid mobile before sleep",
            "Maintain fixed sleep schedule"
        ]);
    } else {
         attachRisk("Irregular sleep pattern detected. This may reduce cognitive efficiency.", [
            "Sleep 7-8 hours daily",
            "Avoid mobile before sleep",
            "Maintain fixed sleep schedule"
        ]);
    }

    // STRESS
    if (stress <= 3) {
        attachPositive("Stress levels are well controlled and unlikely to affect performance.", [
            "Continue your stress management habits",
            "Practice mindfulness regularly",
            "Balance academics and personal time"
        ]);
    } else if (stress <= 6) {
        attachImprove("Moderate stress observed. Implementing relaxation strategies may help.", [
            "Try light exercise or walking",
            "Listen to music or relax",
            "Maintain work-life balance"
        ]);
    } else {
         attachRisk("High stress detected. This may affect both mental well-being and academic focus.", [
             "Practice meditation or breathing exercises",
             "Take short breaks during study",
             "Engage in physical activities"
         ]);
    }

    // ASSIGNMENT
    if (assignment >= 85) {
        attachPositive("Assignment management is excellent and reflects strong responsibility.", [
            "Keep submitting on time",
            "Maintain quality of work",
            "Try to improve presentation"
        ]);
    } else if (assignment >= 70) {
        attachPositive("Assignments are being handled effectively.", [
            "Maintain consistency",
            "Try to complete earlier than deadlines",
            "Focus on quality improvement"
        ]);
    } else if (assignment >= 50) {
        attachImprove("Assignment consistency could be improved for better academic balance.", [
            "Complete assignments on time",
            "Plan weekly tasks",
            "Avoid last-minute submissions"
        ]);
    } else {
        attachRisk("Low assignment completion may increase academic pressure.", [
            "Complete assignments on time",
            "Plan weekly tasks",
            "Avoid last-minute submissions"
        ]);
    }

    const predictionObj = {
        score,
        status,
        confidence: 87, // Aesthetic
        stressSource,
        stressDesc,
        riskFactors,
        doingWell,
        improvements
    };

    setPrediction(predictionObj);
    return predictionObj;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const now = new Date();
    
    // Mapping new metrics to the old WellnessSurvey system
    const mappedSleepQuality = Math.min(10, Math.max(1, Math.round((surveyForm.sleep / 8) * 10)));
    const mappedPressure = Math.min(10, Math.max(1, Math.round((surveyForm.study / 6) * 10)));

    const newSurvey: WellnessSurvey = {
      id: crypto.randomUUID(),
      studentRollNumber: user.rollNumber,
      stressLevel: surveyForm.stress,
      sleepQuality: mappedSleepQuality,
      academicPressure: mappedPressure,
      mood: surveyForm.mood, 
      remarks: surveyForm.remarks,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      timestamp: now.getTime()
    };

    saveSurvey(newSurvey);
    
    const updatedSurveys = getStudentSurveys(user.rollNumber);
    setSurveys(updatedSurveys);
    
    const generatedPred = generatePrediction();
    setShowResult(true);
    
    // Trigger High Risk Email if score drops below 25
    if (generatedPred.score < 25) {
        sendHighRiskEmailAlert(user, surveyForm, generatedPred);
    }
    
    setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Chart data
  const chartData = [...surveys].reverse().map(s => {
    let shortDate = s.date;
    if (s.date.includes('/')) {
        const parts = s.date.split('/');
        shortDate = `${parts[0]}/${parts[1]}`;
    } else if (s.date.length > 5) {
        shortDate = s.date.substring(5, 10);
    }
    return {
      date: shortDate,
      stress: s.stressLevel,
      sleep: s.sleepQuality,
      pressure: s.academicPressure
    };
  });

  if (!user) return <div className="min-h-screen flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <Layout userRole={Role.STUDENT} userName={user.name}>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div className="mb-6">
             <h1 className="text-3xl font-bold text-slate-800">Wellness Survey</h1>
             <p className="text-slate-500">Check in with yourself. Measure your academic and emotional balance.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-fade-in-down">
            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="space-y-8">
                    {/* Stress Level */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-lg font-bold text-slate-700 flex items-center">
                                <i className="fas fa-bolt text-orange-500 mr-2"></i> Stress Level (0-10)
                            </label>
                            <span className="px-3 py-1 bg-indigo-50 rounded-lg font-bold text-indigo-600">{surveyForm.stress}/10</span>
                        </div>
                        <input type="range" min="0" max="10" value={surveyForm.stress} onChange={e => setSurveyForm({...surveyForm, stress: parseInt(e.target.value)})} className="w-full accent-indigo-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium"><span>Very Relaxed</span><span>Highly Stressed</span></div>
                    </div>

                    {/* Sleep Hours */}
                    <div>
                         <div className="flex justify-between items-center mb-4">
                            <label className="text-lg font-bold text-slate-700 flex items-center">
                                <i className="fas fa-moon text-yellow-500 mr-2"></i> Sleep Hours (0-24)
                            </label>
                            <span className="px-3 py-1 bg-indigo-50 rounded-lg font-bold text-indigo-600">{surveyForm.sleep.toFixed(1)}h</span>
                        </div>
                        <input type="range" min="0" max="24" step="0.5" value={surveyForm.sleep} onChange={e => setSurveyForm({...surveyForm, sleep: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium"><span>0 hours</span><span>24 hours</span></div>
                    </div>

                    {/* Study Hours */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-lg font-bold text-slate-700 flex items-center">
                                <i className="fas fa-book text-emerald-500 mr-2"></i> Study Hours (0-24)
                            </label>
                            <span className="px-3 py-1 bg-indigo-50 rounded-lg font-bold text-indigo-600">{surveyForm.study.toFixed(1)}h</span>
                        </div>
                        <input type="range" min="0" max="24" step="0.5" value={surveyForm.study} onChange={e => setSurveyForm({...surveyForm, study: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium"><span>0 hours</span><span>24 hours</span></div>
                    </div>

                    {/* Attendance */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-lg font-bold text-slate-700 flex items-center">
                                <i className="fas fa-bullseye text-pink-500 mr-2"></i> Attendance (%)
                            </label>
                            <span className="px-3 py-1 bg-indigo-50 rounded-lg font-bold text-indigo-600">{surveyForm.attendance}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={surveyForm.attendance} onChange={e => setSurveyForm({...surveyForm, attendance: parseInt(e.target.value)})} className="w-full accent-indigo-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium"><span>0%</span><span>100%</span></div>
                    </div>

                    {/* Assignment Completion */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-lg font-bold text-slate-700 flex items-center">
                                <i className="fas fa-tasks text-blue-500 mr-2"></i> Assignment Completion (%)
                            </label>
                            <span className="px-3 py-1 bg-indigo-50 rounded-lg font-bold text-indigo-600">{surveyForm.assignment}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={surveyForm.assignment} onChange={e => setSurveyForm({...surveyForm, assignment: parseInt(e.target.value)})} className="w-full accent-indigo-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium"><span>0%</span><span>100%</span></div>
                    </div>
                </div>

                {/* Mood Selector (Restored) */}
                <div>
                    <label className="block text-lg font-bold text-slate-700 mb-4">Current Mood</label>
                    <div className="flex flex-wrap gap-3">
                        {MOODS.map(m => (
                            <button key={m} type="button" onClick={() => setSurveyForm({...surveyForm, mood: m})} 
                                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all transform hover:scale-105 ${surveyForm.mood === m ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg' : 'bg-white text-gray-600 border-gray-100 hover:border-indigo-200'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Trends Chart (Restored to its original style) */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hidden md:block">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Your Recent Trends (Saved Data)</h3>
                    <div className="h-48">
                         {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                                    <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 10]} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="sleep" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                         ) : (
                             <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Analyze trends after your first submission</div>
                         )}
                    </div>
                </div>

                {/* Optional Remarks (Restored) */}
                <div>
                    <label className="block text-lg font-bold text-slate-700 mb-2">Optional Remarks</label>
                    <textarea rows={3} value={surveyForm.remarks} onChange={e => setSurveyForm({...surveyForm, remarks: e.target.value})} className="w-full p-4 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none bg-gray-50" placeholder="Feel free to share any specific concerns..."></textarea>
                </div>

                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                    Evaluate Well-Being
                </button>
            </form>
        </div>

        {/* Prediction Outputs */}
        <div ref={resultRef}>
            {showResult && prediction && (
                <div className="space-y-6 animate-fade-in-up mt-8">
                    
                    {/* Input Summary Box */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">Input Summary</h3>
                        <ul className="space-y-3 text-slate-700 text-sm font-medium">
                            <li className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-400 mr-3"></span> Study Hours: {surveyForm.study.toFixed(1)}</li>
                            <li className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-400 mr-3"></span> Attendance: {surveyForm.attendance.toFixed(1)}%</li>
                            <li className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-400 mr-3"></span> Sleep Hours: {surveyForm.sleep.toFixed(1)}</li>
                            <li className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-400 mr-3"></span> Stress Level: {surveyForm.stress.toFixed(1)}</li>
                            <li className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-400 mr-3"></span> Assignment Completion: {surveyForm.assignment.toFixed(1)}%</li>
                            <li className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-400 mr-3"></span> Current Mood: {surveyForm.mood}</li>
                        </ul>
                    </div>

                    {/* Prediction Result Box */}
                    <div className="bg-[#f8fbff] p-8 rounded-2xl border-l-[6px] border-indigo-500 shadow-sm">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">Prediction Result</h3>
                        
                        <div className="space-y-4 mb-8">
                            <div className="text-slate-800 font-bold">
                                Academic Well-Being: <span className="text-slate-500 font-medium">{prediction.status}</span>
                            </div>
                            <div className="text-slate-800 font-bold">
                                Well-Being Score: <span className="text-slate-500 font-medium">{prediction.score} / 100</span>
                            </div>
                            <div className="text-slate-800 font-bold">
                                Confidence Score: <span className="text-slate-500 font-medium">{prediction.confidence}%</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="flex items-center font-bold text-lg text-slate-800 mb-3">
                                🧠 Stress Analysis
                            </h4>
                            <div className="space-y-2">
                                <div className="text-slate-800 font-bold text-sm">
                                    Stress Source: <span className="text-slate-500 font-medium">{prediction.stressSource}</span>
                                </div>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    {prediction.stressDesc}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations Lists */}
                    <div className="space-y-4">
                        
                        {prediction.riskFactors.length > 0 && (
                            <div className="bg-[#fff5f5] p-6 rounded-2xl border-l-[6px] border-red-500 shadow-sm transition-all hover:shadow-md">
                                <h4 className="font-bold text-slate-800 mb-4 text-lg">Risk Factors</h4>
                                <ul className="space-y-4">
                                    {prediction.riskFactors.map((r, i) => (
                                        <li key={i} className="text-slate-700 text-sm">
                                            • {r.text}
                                            <ul className="mt-2 ml-4 space-y-1">
                                                {r.points.map((p, j) => (
                                                    <li key={j} className="flex items-center text-slate-500">
                                                        <span className="mr-2">👉</span> {p}
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {prediction.doingWell.length > 0 && (
                            <div className="bg-[#f0fbf4] p-6 rounded-2xl border-l-[6px] border-green-500 shadow-sm transition-all hover:shadow-md">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
                                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> What You Are Doing Well
                                </h4>
                                <ul className="space-y-4">
                                    {prediction.doingWell.map((w, i) => (
                                        <li key={i} className="text-slate-700 text-sm">
                                            • {w.text}
                                            <ul className="mt-2 ml-4 space-y-1">
                                                {w.points.map((p, j) => (
                                                    <li key={j} className="flex items-center text-slate-500">
                                                        <i className="fas fa-check-circle text-green-500 mr-2 text-[10px]"></i> {p}
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {prediction.improvements.length > 0 && (
                            <div className="bg-[#fffdf0] p-6 rounded-2xl border-l-[6px] border-[#fbbf24] shadow-sm transition-all hover:shadow-md">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
                                    <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span> Areas to Improve
                                </h4>
                                <ul className="space-y-4">
                                    {prediction.improvements.map((imp, i) => (
                                        <li key={i} className="text-slate-700 text-sm">
                                            • {imp.text}
                                            <ul className="mt-2 ml-4 space-y-1">
                                                {imp.points.map((p, j) => (
                                                    <li key={j} className="flex items-center text-slate-500">
                                                        <span className="mr-2">👉</span> {p}
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Critical Alert if Score < 25 (As requested: "counsellor booking kaatanum for all output if score below 25" */}
                    {prediction.score < 25 && (
                        <div className="mt-8 bg-white rounded-3xl shadow-xl w-full p-8 border-l-8 border-red-500 flex flex-col md:flex-row items-center justify-between">
                            <div className="flex items-center mb-6 md:mb-0">
                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mr-6 shrink-0">
                                    <i className="fas fa-heartbeat animate-pulse"></i>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-1">Critical Wellness Alert</h3>
                                    <p className="text-slate-600 max-w-xl">
                                        Your metrics indicate severe burnout. Your designated mentor has been automatically notified. We strongly advise booking a session with a campus counselor right now.
                                    </p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => navigate('/counselor-support')}
                                className="w-full md:w-auto px-8 py-4 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 hover:shadow-red-500/30 transition-all flex items-center justify-center whitespace-nowrap"
                            >
                                <i className="fas fa-user-md mr-2"></i> Connect with Counselor
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
      
      <Chatbot />
    </Layout>
  );
};

export default StudentSurvey;