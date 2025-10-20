import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Home, Users, Trophy, User, UserPlus, ChevronLeft, ChevronDown, ChevronRight, Zap, RefreshCw, X, Check, Timer, 
    Shield, ListOrdered, Hash, Clock, Plus, LogIn, Search, Lock, Unlock, Star, MessageSquare,
    ArrowUp, ArrowDown, Minus, Calendar, Settings, Clipboard, Edit, Trash2, RotateCcw, AlertTriangle,
    // FIX: Imported missing Loader icons and CheckCircle
    Loader, Loader2, CheckCircle
} from 'lucide-react';

// --- MOCK DATA ---
// NOTE: In a real app, this data would be fetched from your Python/MongoDB backend.
const MOCK_USER = {
    id: 'user_telegram_12345',
    name: "Alex FootyFan",
    username: "@alexff",
    avatarUrl: "https://placehold.co/100x100/1e293b/94a3b8?text=AF", 
    overallScore: 14500,
    globalRank: 47,
    totalPlayers: 250999,
};

const MOCK_QUIZ_CONFIG = {
    id: "daily_001",
    name: "Golden Boot Legends",
    questionsCount: 15,
    timeLimitSeconds: 90,
    pointsPerQuestion: 10,
    totalPoints: 150,
    initialExpiresIn: 86400, // 24 hours in seconds
};

const MOCK_QUESTIONS = [
    { id: 'q1', text: "Which player has won the most Ballon d'Or awards?", options: ["Lionel Messi", "Cristiano Ronaldo", "Michel Platini", "Johan Cruyff"], correctAnswer: "Lionel Messi" },
    { id: 'q2', text: "In which year did Leicester City win the Premier League?", options: ["2014", "2016", "2018", "2020"], correctAnswer: "2016" },
    { id: 'q3', text: "What is the official name of the stadium where FC Barcelona plays?", options: ["Santiago Bernabéu", "San Siro", "Camp Nou", "Anfield"], correctAnswer: "Camp Nou" },
    { id: 'q4', text: "Which country won the FIFA World Cup in 2014?", options: ["Brazil", "Argentina", "Germany", "Spain"], correctAnswer: "Germany" },
    { id: 'q5', text: "How many substitutes are currently permitted in a standard FIFA match?", options: ["3", "5", "7", "Unlimited"], correctAnswer: "5" },
];

const MOCK_POPULAR_LEAGUES = [
    { id: 3, name: "Euro Elite Trivial", description: "Test your UCL/UEL knowledge.", members: 560, startsIn: 3600, rank: 1 },
    { id: 4, name: "Classic EPL Heads", description: "90s and 2000s English football quiz.", members: 320, startsIn: 10800, rank: 2 },
    { id: 5, name: "South American Soccer", description: "Quiz on CONMEBOL teams and legends.", members: 150, startsIn: 5400, rank: 3 },
];

const MOCK_TASKS = [
    { name: "Join us on Telegram", points: 100, action: "Join", icon: <MessageSquare size={18} /> },
    { name: "Invite 5 friends to the game", points: 1000, action: "Invite", icon: <Users size={18} /> },
    { name: "Claim free 500 points", points: 500, action: "Claim", icon: <Clock size={18} /> },
];

// --- MOCK DATA (Leaderboard - NEW) ---
const mockLeaderboardData = [
  { id: 1, userName: "Anya", gamePoints: 15230, currentRank: 1, previousRank: 1, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=A" },
  { id: 2, userName: "Zenith_Rider", gamePoints: 12100, currentRank: 2, previousRank: 4, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=ZR" }, // Rank UP
  { id: 3, userName: "Shadow_Sniper", gamePoints: 11950, currentRank: 3, previousRank: 2, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=SS" }, // Rank DOWN
  { id: 4, userName: "CodeBreaker", gamePoints: 11800, currentRank: 4, previousRank: 4, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=CB" }, // No Change
  { id: 5, userName: "GalaxyGamer", gamePoints: 10500, currentRank: 5, previousRank: 7, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=GG" }, // Rank UP
  { id: 6, userName: "Pixel_Pirate", gamePoints: 9800, currentRank: 6, previousRank: 5, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=PP" }, // Rank DOWN
  { id: 7, userName: "TheArchitect", gamePoints: 7550, currentRank: 7, previousRank: null, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=TA" }, // New User
  { id: 8, userName: "MysticMage", gamePoints: 7900, currentRank: 8, previousRank: 8, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=MM" },
  { id: 9, userName: "DriftKing", gamePoints: 6500, currentRank: 9, previousRank: 10, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=DK" }, // Rank UP
  { id: 10, userName: "LunarPhoenix", gamePoints: 5800, currentRank: 10, previousRank: 9, avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=LP" }, // Rank DOWN
];

// --- Utility Functions ---

/**
 * Triggers native device vibration for feedback.
 */
const triggerVibration = (pattern) => {
    if (window.navigator && window.navigator.vibrate) {
        // Pattern: [duration_ms, pause_ms, duration_ms, ...]
        window.navigator.vibrate(pattern); 
    }
};

// --- COMPONENTS ---

/**
 * Component for the persistent bottom navigation bar.
 */
const BottomNav = ({ currentPage, setPage }) => {
    const navItems = [
        { name: 'Home', icon: Home, page: 'home' },
        { name: 'League', icon: Users, page: 'league' },
        { name: 'Tournament', icon: Trophy, page: 'tournament' },
        { name: 'Profile', icon: User, page: 'profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-2xl z-50">
            <div className="flex justify-around h-16 max-w-xl mx-auto">
                {navItems.map((item) => {
                    const isActive = currentPage === item.page;
                    const colorClass = isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-indigo-300';
                    return (
                        <button
                            key={item.page}
                            onClick={() => setPage(item.page)}
                            className={`flex flex-col items-center justify-center text-xs font-medium transition-colors ${colorClass} pt-1`}
                        >
                            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="mt-1">{item.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};


// --- LEADERBOARD HELPERS (NEW) ---

/**
 * Component to display the rank change icon (Green Up, Red Down, Gray Dash).
 */
const RankChangeIcon = ({ currentRank, previousRank }) => {
  if (previousRank === null || previousRank === undefined) {
    // New user or initial entry
    return <span className="text-indigo-400 font-medium text-xs">NEW</span>;
  }

  // Rank logic: a lower number is a better rank.
  if (currentRank < previousRank) {
    // Went up in rank (e.g., from 5th to 3rd)
    const diff = previousRank - currentRank;
    return (
        <span className="flex items-center text-green-500 font-bold">
            <ArrowUp className="w-4 h-4 mr-0.5" />
            <span className="text-xs">{diff}</span>
        </span>
    );
  } else if (currentRank > previousRank) {
    // Went down in rank (e.g., from 3rd to 5th)
    const diff = currentRank - previousRank;
    return (
        <span className="flex items-center text-red-500 font-bold">
            <ArrowDown className="w-4 h-4 mr-0.5" />
            <span className="text-xs">{diff}</span>
        </span>
    );
  } else {
    // No change in rank
    return <Minus className="w-4 h-4 text-gray-400" />;
  }
};

// --- GLOBAL LEADERBOARD COMPONENT (NEW) ---
const GlobalLeaderboard = ({ setPage }) => {

  // Sort the mock data by gamePoints (descending) 
  const sortedData = useMemo(() => 
    [...mockLeaderboardData].sort((a, b) => b.gamePoints - a.gamePoints)
  , []);

  return (
    <div className="min-h-screen bg-gray-900 p-4 pt-8 pb-20">
        <div className="max-w-xl mx-auto">
            {/* Header and Back Button */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => setPage('home')}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-gray-800 text-indigo-400 rounded-full shadow-lg border border-gray-700 hover:bg-gray-700 transition duration-150"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className='font-semibold text-sm'>Back</span>
                </button>
                <h1 className="text-2xl font-extrabold text-white flex items-center">
                    <Trophy className="w-6 h-6 text-yellow-400 mr-2" />
                    Global Leaderboard
                </h1>
            </div>

            {/* Leaderboard Table Card */}
            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-10 text-xs sm:text-sm font-semibold uppercase text-gray-400 bg-gray-700 p-4">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-2 text-center">Change</div>
                    <div className="col-span-4">User</div>
                    <div className="col-span-3 text-right">Points</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-gray-700">
                    {sortedData.map((user, index) => (
                        <div
                            key={user.id}
                            className={`grid grid-cols-10 items-center p-4 transition duration-200 hover:bg-gray-700/50
                            ${index < 3 ? 'font-bold bg-gray-700/30' : 'text-gray-300'}`}
                        >
                            {/* Rank */}
                            <div className="col-span-1 text-center">
                                <span className={`text-lg ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-500' : 'text-gray-400'}`}>
                                    {index + 1}
                                </span>
                            </div>

                            {/* Rank Change Arrow/Icon */}
                            <div className="col-span-2 flex justify-center">
                                <RankChangeIcon
                                    currentRank={user.currentRank}
                                    previousRank={user.previousRank}
                                />
                            </div>

                            {/* User Name and Avatar */}
                            <div className="col-span-4 flex items-center space-x-3 truncate"> 
                            <img
                                src = {user.avatar}
                                 alt={`${user.userName} Avatar`}
                                  className="w-8 h-8 rounded-full object-cover border border-indigo-400 shadow"
                                        // Added onerror fallback in case the placeholder image fails to load
                                        onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/40x40/6B7280/fff?text=?" }}
                                    />
                                <span className="text-sm sm:text-base font-semibold truncate">{user.userName}</span>
                            </div>

                            {/* Points */}
                            <div className="col-span-3 text-right">
                                <span className="text-base font-extrabold text-white">
                                    {user.gamePoints.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <p className="mt-6 text-center text-sm text-gray-500">
                Mock data is used. Red/Green icons show rank movement since the previous period.
            </p>
        </div>
        <div className="h-16"></div> {/* Nav buffer */}
    </div>
  );
};

// --- PAGE COMPONENTS ---

// ----------------------------------------------------
// QUIZ PAGE (Active Quiz State - Embedded within Home Page)
// ----------------------------------------------------
const QuizPage = ({ questions, finishQuiz, overallScoreUpdater }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [timeLeft, setTimeLeft] = useState(MOCK_QUIZ_CONFIG.timeLimitSeconds);

    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const progress = (currentQuestionIndex / totalQuestions) * 100;
    const accuracy = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(0) : 0;
    
    // FIX: Moved finishQuizHandler definition before the useEffect that uses it
    // to resolve "Cannot access 'finishQuizHandler' before initialization" error.
    // Cleanup and Finalize Quiz
    const finishQuizHandler = useCallback(() => {
        // Update user's overall score (Mocked)
        overallScoreUpdater(score * MOCK_QUIZ_CONFIG.pointsPerQuestion);
        
        finishQuiz({
            answered: currentQuestionIndex + 1, // Number of questions seen/attempted
            correct: score,
            points: score * MOCK_QUIZ_CONFIG.pointsPerQuestion,
            accuracy: accuracy,
            total: totalQuestions,
        });
    }, [currentQuestionIndex, score, accuracy, totalQuestions, finishQuiz, overallScoreUpdater]);

    // Timer Effect
    useEffect(() => {
        if (timeLeft <= 0) {
            finishQuizHandler();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, finishQuizHandler]); 


    const handleAnswerClick = (option) => {
        if (isChecking) return;
        setSelectedAnswer(option);
    };

    const checkAnswer = () => {
        if (!selectedAnswer || isChecking) return;

        setIsChecking(true);
        const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

        if (isCorrect) {
            setScore(prevScore => prevScore + 1);
            triggerVibration(100); // Short tap for correct
        } else {
            triggerVibration([100, 50, 100]); // Double pulse for incorrect
        }

        setTimeout(() => {
            setIsChecking(false);
            setSelectedAnswer(null);
            const nextIndex = currentQuestionIndex + 1;
            
            if (nextIndex < totalQuestions) {
                setCurrentQuestionIndex(nextIndex);
            } else {
                finishQuizHandler();
            }
        }, 1200); // Show result for 1.2 seconds
    };

    // Helper function to determine button styling based on state
    const getAnswerButtonStyle = (option) => {
        const isSelected = option === selectedAnswer;
        
        if (!isChecking) {
            // Default active state
            return isSelected 
                ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' 
                : 'bg-gray-700 text-gray-100 hover:bg-gray-600';
        }

        // Checking/Result state
        const isCorrectAnswer = option === currentQuestion.correctAnswer;

        if (isCorrectAnswer) {
            return 'bg-green-600 text-white shadow-xl ring-2 ring-green-400';
        } else if (isSelected && !isCorrectAnswer) {
            return 'bg-red-600 text-white shadow-xl ring-2 ring-red-400';
        } else {
            return 'bg-gray-700 text-gray-500 opacity-60';
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-900 p-4 pt-10 pb-20">
            <div className="flex justify-between items-center mb-6 p-4 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
                <div className="flex items-center text-white">
                    <Timer size={20} className="text-red-400 mr-2" />
                    <span className="text-2xl font-bold">{formatTime(timeLeft)}</span>
                </div>
                <div className="text-sm font-semibold text-gray-300">
                    {MOCK_QUIZ_CONFIG.name}
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between text-gray-300 font-semibold text-sm mb-1">
                    <span>Question {currentQuestionIndex + 1} / {totalQuestions}</span>
                    <span>Correct: {score}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                        className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl mb-6 border border-gray-700">
                <p className="text-xl font-bold text-white mb-6">
                    {currentQuestion.text}
                </p>
                <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((option) => (
                        <button
                            key={option}
                            onClick={() => handleAnswerClick(option)}
                            disabled={isChecking}
                            className={`p-4 rounded-xl font-medium text-left transition-all duration-300 transform shadow-md text-base ${getAnswerButtonStyle(option)}`}
                        >
                            <span className="flex justify-between items-center">
                                {option}
                                {isChecking && option === currentQuestion.correctAnswer && <Check size={20} className="text-green-200" />}
                                {isChecking && option === selectedAnswer && option !== currentQuestion.correctAnswer && <X size={20} className="text-red-200" />}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={checkAnswer}
                disabled={!selectedAnswer || isChecking}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {isChecking ? (
                    <>
                        <Loader size={20} className="mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <ChevronRight size={20} className="mr-2" />
                        Submit & Next
                    </>
                )}
            </button>
        </div>
    );
};


// ----------------------------------------------------
// HOME PAGE (Main screen content)
// ----------------------------------------------------
const HomePage = ({ userData, setGameState, quizConfig, quizState, overallScoreUpdater, setPage }) => {
    const [timeLeft, setTimeLeft] = useState(quizConfig.initialExpiresIn);
    
    // Countdown Timer for Quiz Expiration
    useEffect(() => {
        if (quizState.status !== 'start') return;

        if (timeLeft <= 0) {
            // In a real app, this would reset the quiz config from the server
            setGameState('expired');
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, quizState.status, setGameState, quizConfig.initialExpiresIn]); // Added dependencies

    const handleStartQuiz = () => {
        setGameState('active');
    };

    const handlePlayAgain = () => {
        // Reset local quiz timer for demonstration
        setTimeLeft(quizConfig.initialExpiresIn); 
        setGameState('start');
    };

    const renderQuizCard = () => (
        <div className="bg-gray-800 p-5 rounded-2xl shadow-xl border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Zap size={20} className="text-yellow-400 mr-2" />
                Today's Quiz: {quizConfig.name}
            </h2>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-6">
                <div className="flex items-center"><ListOrdered size={16} className="text-indigo-400 mr-2" /> {quizConfig.questionsCount} Questions</div>
                <div className="flex items-center"><Timer size={16} className="text-indigo-400 mr-2" /> {quizConfig.timeLimitSeconds} Seconds</div>
                <div className="flex items-center"><Star size={16} className="text-indigo-400 mr-2" /> {quizConfig.totalPoints} Points</div>
                <div className="flex items-center"><Clock size={16} className="text-indigo-400 mr-2" /> Expires In: <span className="text-yellow-400 ml-1 font-semibold">{formatTime(timeLeft)}</span></div>
            </div>

            <button
                onClick={handleStartQuiz}
                disabled={timeLeft <= 0}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {timeLeft > 0 ? <><ChevronRight size={20} className="mr-2" /> Start Quiz</> : "Quiz Expired"}
            </button>
        </div>
    );

    const renderResultsCard = () => (
        <div className="bg-gray-800 p-5 rounded-2xl shadow-xl border border-gray-700 text-center">
            <Trophy size={48} className="text-yellow-400 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-white mb-2">Quiz Results!</h2>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-200 bg-gray-700 p-4 rounded-xl">
                <div>Answered: <span className="font-semibold text-white">{quizState.results.answered} / {quizState.results.total}</span></div>
                <div>Correct: <span className="font-semibold text-white">{quizState.results.correct}</span></div>
                <div>Points Earned: <span className="font-semibold text-green-400">{quizState.results.points}</span></div>
                <div>Accuracy: <span className="font-semibold text-white">{quizState.results.accuracy}%</span></div>
            </div>
            <button
                onClick={handlePlayAgain}
                className="mt-4 w-full py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
            >
                <RefreshCw size={18} className="inline mr-2" /> Check Back Tomorrow
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 p-4 pt-8 pb-20 space-y-6">
            <h1 className="text-2xl font-extrabold text-white">
                Welcome, <span className="text-indigo-400">{userData.name}</span>!
            </h1>

            {/* Quiz Section (Top) */}
            {(quizState.status === 'start' || quizState.status === 'expired') && renderQuizCard()}
            {quizState.status === 'finished' && renderResultsCard()}


            {/* Overall Score & Leaderboard */}
            <div className="bg-gray-800 p-5 rounded-2xl shadow-xl border border-gray-700">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="text-sm font-medium text-gray-400">Overall Score</p>
                        <p className="text-4xl font-black text-yellow-400">{userData.overallScore.toLocaleString()}</p>
                    </div>
                    <button
                    onClick={() => setPage('leaderboard')} 
                    className="flex items-center text-indigo-400 hover:text-indigo-300 font-semibold text-sm p-2 rounded-lg bg-gray-700/50">
                        View Leaderboard
                        <ChevronRight size={18} className="ml-1" />
                    </button>
                </div>

                <div className="border-t border-gray-700 pt-3 flex items-center text-gray-300">
                    <ListOrdered size={20} className="text-green-400 mr-2" />
                    <p className="font-medium">
                        Global Rank: <span className="text-lg font-bold text-white">#{userData.globalRank.toLocaleString()}</span> / {userData.totalPlayers.toLocaleString()} players
                    </p>
                </div>
            </div>

            {/* Empty space to ensure content is above the Nav */}
            <div className="h-16"></div>
        </div>
    );
};


// ----------------------------------------------------
// LEAGUE PAGE
// ----------------------------------------------------

// --- CONFIGURATION AND UTILITIES ---

// Placeholder for API Key and Base URL
const API_BASE_URL = 'http://localhost:5000';
const apiKey = "";

// Helper function to format a Date object into YYYY-MM-DD string
const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
};

// Helper to format time (e.g., from seconds to "1d 5h")
const formatTime = (seconds) => {
    if (seconds < 0) return "League Ended";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);

    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

// Helper for generating a mock code for display if creation succeeds
const generateLeagueCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// Converts date string to time remaining in seconds
const calculateTimeRemaining = (endDateStr) => {
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((end - now) / 1000));
};

// --- MOCK DATA ---

// Mock data for league list (minimal detail)
const MOCK_LEAGUES = [
    { id: 1, name: "The Champions' Circle", description: "Elite-level strategic drafting.", isOwner: true, rank: 12, points: 55000, members: 15 },
    { id: 2, name: "Weekend Warriors", description: "Casual, fun league with friends.", isOwner: false, rank: 5, points: 6200, members: 8 },
];

// Mock data for league details (extensive detail for the new page)
const MOCK_LEAGUE_DETAILS_DATA = {
    1: { 
        id: 1,
        name: "The Champions' Circle",
        description: "Elite-level strategic drafting. For serious players only.",
        isOwner: true,
        code: "G8H7P3",
        startDate: "2025-10-01",
        endDate: "2025-12-01", // End in the future
        totalWeeks: 9,
        currentGameWeek: 3,
        members: [
            { rank: 1, username: "Alice", avatarUrl: "https://placehold.co/40x40/4F46E5/white?text=A", points: 8520, rankChange: 1, isMe: false },
            { rank: 2, username: "Me (The User)", avatarUrl: "https://placehold.co/40x40/F59E0B/black?text=ME", points: 8500, rankChange: 0, isMe: true },
            { rank: 3, username: "Bob", avatarUrl: "https://placehold.co/40x40/EF4444/white?text=B", points: 7980, rankChange: -1, isMe: false },
            { rank: 4, username: "Charlie", avatarUrl: "https://placehold.co/40x40/10B981/white?text=C", points: 7010, rankChange: 2, isMe: false },
            { rank: 5, username: "David", avatarUrl: "https://placehold.co/40x40/3B82F6/white?text=D", points: 6800, rankChange: 0, isMe: false },
        ],
        recentResults: [
            { week: 3, topScorer: "Charlie", score: 3200 },
            { week: 2, topScorer: "Alice", score: 2800 },
            { week: 1, topScorer: "Me (The User)", score: 2500 },
        ],
        isEnded: false,
        winner: null,
    },
    2: {
        id: 2,
        name: "Weekend Warriors",
        description: "Casual, fun league with friends.",
        isOwner: false,
        code: "J6K9L1",
        startDate: "2025-09-01",
        endDate: "2025-10-01", // End in the past
        totalWeeks: 4,
        currentGameWeek: 4,
        members: [
            { rank: 1, username: "WinnerBoss", avatarUrl: "https://placehold.co/40x40/14B8A6/white?text=W", points: 10520, rankChange: 0, isMe: false },
            { rank: 2, username: "Me (The User)", avatarUrl: "https://placehold.co/40x40/F59E0B/black?text=ME", points: 6200, rankChange: 0, isMe: true },
            { rank: 3, username: "Zeta", avatarUrl: "https://placehold.co/40x40/FBBF24/black?text=Z", points: 5980, rankChange: 0, isMe: false },
        ],
        recentResults: [
            { week: 4, topScorer: "WinnerBoss", score: 3000 },
            { week: 3, topScorer: "Zeta", score: 2000 },
            { week: 2, topScorer: "WinnerBoss", score: 3500 },
        ],
        isEnded: true,
        winner: "WinnerBoss",
    }
};

// --- AUTH LOGIC (Telegram Ready) ---

/**
 * Checks for the Telegram User ID. If not found (i.e., running locally), 
 * it generates a mock ID.
 */
const getUserId = () => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    // If running inside Telegram, use the real user ID
    if (tgUser && tgUser.id) {
        return {
            id: tgUser.id.toString(),
            source: 'Telegram'
        };
    }
    
    // Fallback for local development
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'user-';
    for (let i = 0; i < 20; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return {
        id: id,
        source: 'Mock'
    };
};

// --- API FETCH UTILITIES WITH EXPONENTIAL BACKOFF ---

const MAX_RETRIES = 3;

/**
 * Handles API fetch requests with exponential backoff for retries.
 */
const fetchWithRetry = async (url, options, retryCount = 0) => {
    try {
        const response = await fetch(url, options);
        if (response.status === 429 && retryCount < MAX_RETRIES) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retryCount + 1);
        }
        return response;
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.error(`Network error: ${error.message}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retryCount + 1);
        }
        throw new Error('Failed to fetch data after multiple retries.');
    }
};

/**
 * Executes a POST request to create a league.
 * Route: POST /api/leagues/create
 */
const createLeague = async (data, userId) => {
    const url = `${API_BASE_URL}/api/leagues/create?key=${apiKey}`;
    const payload = {
        name: data.name,
        description: data.description || '',
        is_public: !data.is_private,
        creator_id: userId // CRITICAL: Identify the user
    };

    const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Failed to create league.');
    }
    return result; // Should return { league_id, join_code }
};

/**
 * Executes a POST request to check a join code.
 * Route: POST /api/leagues/join/check
 */
const checkJoinCode = async (code, userId) => {
    const url = `${API_BASE_URL}/api/leagues/join/check?key=${apiKey}`;
    const payload = { code, user_id: userId };

    const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Invalid or expired league code.');
    }
    return result; // Should return { league_id, name, description }
};

/**
 * Executes a POST request to confirm joining a league.
 * Route: POST /api/leagues/join/confirm
 */
const confirmJoin = async (leagueId, userId) => {
    const url = `${API_BASE_URL}/api/leagues/join/confirm?key=${apiKey}`;
    const payload = { league_id: leagueId, user_id: userId };

    const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Failed to join league.');
    }
    return result; // Should return { message: 'Successfully joined league.' }
};

/**
 * Executes a GET request to search public leagues.
 * Route: GET /api/league/search?query=...
 */
const searchPublicLeagues = async (term) => {
    if (!term) return [];
    const url = `${API_BASE_URL}/api/league/search?query=${encodeURIComponent(term)}&key=${apiKey}`;
    
    const response = await fetchWithRetry(url, { method: 'GET' });
    const result = await response.json();
    
    if (!response.ok) {
        console.error("Search API Error:", result.error || 'Unknown search error');
        return [];
    }
    return result; 
};


// --- UI COMPONENTS ---

const Modal = ({ title, onClose, children }) => {
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 transform transition-all duration-300 scale-100"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <Plus size={24} className="transform rotate-45" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

// --- LEAGUE FORM COMPONENT ---

const LeagueForm = ({ type: initialType = 'create', onClose, userId, refreshLeagues }) => {
    // Local controlled type so the form can switch between Create/Join tabs
    const [type, setType] = useState(initialType);
    const [leagueName, setLeagueName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    
    // NEW STATES for Dynamic League Settings
    const [numberOfWeeks, setNumberOfWeeks] = useState(null); 
    const [showWeeksCollapse, setShowWeeksCollapse] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState(''); // Calculated read-only field

    const [joinCode, setJoinCode] = useState('');
    const [foundLeague, setFoundLeague] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // NEW STATES for Join Workflow
    const [showJoinConfirmation, setShowJoinConfirmation] = useState(false);
    const [showJoinSuccess, setShowJoinSuccess] = useState(false);

    // Get today's date for minimum date input value
    const today = new Date();
    const minDate = formatDate(today);

    // Effect to calculate the End Date dynamically
    useEffect(() => {
        if (startDate && numberOfWeeks > 0) {
            // Create a Date object from the YYYY-MM-DD string
            const start = new Date(startDate);
            
            // Add one day to account for potential timezone shifts when creating the Date object
            // This ensures the calculation starts from the intended day.
            start.setDate(start.getDate() + 1);

            // Total days to add: Weeks * 7 days
            const daysToAdd = numberOfWeeks * 7;
            
            // The league ends on the last day of the final week, so we add (daysToAdd - 1) days to the start date.
            const end = new Date(start);
            end.setDate(end.getDate() + daysToAdd - 1); 
            
            // Format and set the calculated end date
            setEndDate(formatDate(end));
        } else {
            setEndDate(''); // Clear end date if inputs are missing
        }
    }, [startDate, numberOfWeeks]);


    // Reset state when the prop initialType changes (e.g., parent toggles Create/Join)
    useEffect(() => {
        setType(initialType);
        setLeagueName('');
        setDescription('');
        setIsPrivate(false);
        setNumberOfWeeks(null);
        setStartDate('');
        setEndDate('');
        setJoinCode('');
        setFoundLeague(null);
        setMessage('');
        setIsSuccess(false);
        setIsLoading(false);
        setShowJoinConfirmation(false);
        setShowJoinSuccess(false);
    }, [initialType]);


    const handleCreateSubmit = async () => {
        // --- UPDATED VALIDATION: Check for all required fields ---
        if (!leagueName) {
            setMessage('League name is required.');
            return;
        }
        if (!numberOfWeeks || !startDate) {
             setMessage('Both the Number of Game Weeks and Start Date are required.');
            return;
        }
        // End date should always be set if the above two are set, but checking it ensures data consistency
        if (!endDate) { 
             setMessage('Error calculating end date. Please check your start date selection.');
             return;
        }

        setIsLoading(true);
        setMessage('');
        setIsSuccess(false);

        const leagueData = { 
            name: leagueName, 
            description, 
            is_private: isPrivate,
            // NEW DATA FOR SUBMISSION
            duration_weeks: numberOfWeeks,
            start_date: startDate,
            end_date: endDate 
        };

        try {
            const result = await createLeague(leagueData, userId);
            
            const generatedCode = result.join_code || generateLeagueCode(); 

            setMessage(
                <span className="font-semibold">
                    League "{leagueName}" created successfully! 
                    <br/>Share this code: <span className='text-yellow-300'>{generatedCode}</span>
                </span>
            );
            setIsSuccess(true);
            refreshLeagues(); 
            
            setTimeout(onClose, 4000);

        } catch (error) {
            setMessage(error.message || 'Error creating league. Check server connection.');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    // SECTION 2: The League Search/Check Function (Updated)
    const handleJoinCheck = async () => {
        // Reset confirmation/success state before checking
        setShowJoinConfirmation(false);
        setShowJoinSuccess(false);

        if (joinCode.length !== 6) {
            setMessage('Please enter a 6-character code.');
            return;
        }


        setIsLoading(true);
        setMessage('');
        setIsSuccess(false);
        setFoundLeague(null);

        try {
            const league = await checkJoinCode(joinCode, userId);
            if (league.is_member) {
                // If user is already a member, show an error message.
                setMessage(`You are already a member of ${league.name}.`);
                setIsSuccess(false);
            } else {
                  // League found and user is not a member: Start confirmation flow.
            setFoundLeague(league);
            setShowJoinConfirmation(true); // Trigger Popup 1
            setMessage(`Found League: ${league.name}. Confirm to join.`);
            setIsSuccess(true);
            }
        } catch (error) {
            setMessage(error.message || 'League not found or code is invalid.');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    // NEW FUNCTION: Handles 'Yes' click on Confirmation Pop-up (Popup 1)
    const handleConfirmPublicJoin = async () => {
        if (!foundLeague) return;

        // Reset Popup 1
        setShowJoinConfirmation(false); 
        setIsLoading(true);
        setMessage('');
        setIsSuccess(false);

        try {
            await confirmJoin(foundLeague.league_id, userId);
            
            // Success: Trigger Popup 2 and update league list
            refreshLeagues();
            setShowJoinSuccess(true); 
            
        } catch (error) {
            // Failure: Go back to search screen with error message
            setMessage(error.message || 'Error confirming join request.');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Backwards-compatible wrapper expected by some handlers
    const handleConfirmJoin = async () => {
        return handleConfirmPublicJoin();
    };

    // NEW FUNCTION: Function to handle the final closing action after success (Popup 2)
    const handleCloseSuccess = () => {
        setFoundLeague(null);
        setShowJoinSuccess(false);
        onClose();
    };

    const renderCreateForm = () => (
        <div className="space-y-4">
            <input
                type="text"
                placeholder="League Name (Required)"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 border-none"
                disabled={isLoading || isSuccess}
                required
            />
            <textarea
                placeholder="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 border-none resize-none"
                rows="2"
                disabled={isLoading || isSuccess}
            ></textarea>

            {/* --- NEW: Number of Game Weeks Selector (Collapsible) --- */}
            <div className="relative z-10">
                <button
                    type="button"
                    onClick={() => setShowWeeksCollapse(!showWeeksCollapse)}
                    className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 border-none flex justify-between items-center text-left hover:bg-gray-600 transition"
                    disabled={isLoading || isSuccess}
                >
                    <span className={`${!numberOfWeeks ? 'text-gray-400' : 'font-medium'}`}>
                        {numberOfWeeks ? `${numberOfWeeks} Game Week${numberOfWeeks > 1 ? 's' : ''}` : 'Number of Game Weeks (Required)'}
                    </span>
                    <ChevronDown size={20} className={`text-indigo-400 transform transition-transform ${showWeeksCollapse ? 'rotate-180' : ''}`} />
                </button>
                {showWeeksCollapse && (
                    <div className="absolute w-full mt-1 bg-gray-700 rounded-lg shadow-2xl border border-indigo-500/50 overflow-hidden">
                        {[1, 2, 3, 4, 5].map(week => (
                            <button
                                key={week}
                                onClick={() => {
                                    setNumberOfWeeks(week);
                                    setShowWeeksCollapse(false);
                                }}
                                className={`w-full text-left p-3 text-gray-200 hover:bg-indigo-600 transition ${numberOfWeeks === week ? 'bg-indigo-700 font-bold' : ''}`}
                                disabled={isLoading || isSuccess}
                            >
                                Week {week}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {/* --------------------------------------------------- */}

            {/* --- NEW: Start Date and End Date --- */}
            <div className="flex gap-4">
                <div className="w-1/2">
                    <label className="text-xs text-gray-400 block mb-1 flex items-center"><Calendar size={12} className='mr-1'/> Start Date (Required)</label>
                    <input
                        type="date"
                        value={startDate}
                        min={formatDate(new Date())} // Minimum date is today's date
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 border-none"
                        disabled={isLoading || isSuccess}
                        required
                    />
                </div>
                <div className="w-1/2">
                    <label className="text-xs text-gray-400 block mb-1 flex items-center"><Calendar size={12} className='mr-1'/> Calculated End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        readOnly
                        className="w-full p-3 bg-gray-700 text-gray-400 rounded-lg border-none cursor-default"
                        disabled={true} // Use disabled for grayed out read-only style
                    />
                </div>
            </div>
            {/* ------------------------------------ */}

            <div className="flex items-center">
                <input
                    id="private-league"
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-700 rounded border-gray-600 focus:ring-indigo-500"
                    disabled={isLoading || isSuccess}
                />
                <label htmlFor="private-league" className="ml-2 text-sm font-medium text-gray-300">
                    <span className='flex items-center'>
                        This league is a private league {isPrivate ? <Lock size={12} className='ml-1 text-red-400'/> : <Unlock size={12} className='ml-1 text-green-400'/>}
                    </span>
                </label>
            </div>
            {!isSuccess && (
                <button
                    onClick={handleCreateSubmit}
                    className="w-full py-3 bg-yellow-500 text-gray-900 font-bold rounded-xl hover:bg-yellow-400 transition disabled:opacity-50 flex items-center justify-center"
                    disabled={isLoading || !leagueName || !numberOfWeeks || !startDate}
                >
                    {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Create League'}
                </button>
            )}
        </div>
    );

    const renderJoinForm = () => {

        // --- 1. SUCCESS POP-UP VIEW (Highest Priority) ---
        if (showJoinSuccess && foundLeague) {
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-900/50 rounded-2xl border-2 border-green-500 space-y-4">
                    <CheckCircle size={48} className="text-green-400 animate-pulse" />
                    <h3 className="text-3xl font-extrabold text-white text-center">
                        CONGRATULATIONS!
                    </h3>
                    <p className="text-center text-gray-300 text-lg">
                        You successfully joined <span className="text-yellow-400 font-bold">{foundLeague.name}</span>!
                    </p>
                    <p className="text-center text-sm text-gray-400">
                        Check the "My Leagues" tab to view the league details.
                    </p>
                    <button
                        onClick={handleCloseSuccess}
                        className="w-full py-3 mt-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition shadow-lg shadow-green-600/30"
                    >
                        Great, I'm Ready!
                    </button>
                </div>
            );
        }

        // --- 2. CONFIRMATION POP-UP VIEW (Second Highest Priority) ---
        if (showJoinConfirmation && foundLeague) {
            return (
                <div className="flex flex-col items-center p-6 bg-gray-700 rounded-2xl border border-indigo-500/50 space-y-6">
                    <AlertTriangle size={36} className="text-yellow-400" />
                    <h3 className="text-xl font-bold text-white text-center">
                        Do you want to join <span className="text-yellow-400">{foundLeague.name}</span>?
                    </h3>
                    <p className="text-sm text-gray-300 text-center">
                        This league currently has **{foundLeague.member_count || 1}** members.
                    </p>
                    <div className="flex gap-4 w-full">
                        <button
                            onClick={() => {
                                // Cancel: Go back to search by clearing confirmation state
                                setShowJoinConfirmation(false);
                                setFoundLeague(null);
                                setMessage("Confirmation cancelled. Enter a new code to search.");
                                setIsSuccess(false);
                            }}
                            className="w-1/2 py-3 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-400 transition disabled:opacity-50"
                            disabled={isLoading}
                        >
                            No, Cancel
                        </button>
                        <button
                            onClick={handleConfirmJoin} // Renamed from handleConfirmPublicJoin to match user's original hook name
                            className="w-1/2 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <UserPlus size={20} className="mr-2"/>}
                            {isLoading ? 'Joining...' : 'Yes, Join!'}
                        </button>
                    </div>
                </div>
            );
        }


         return (
            <div className="space-y-4">
                {/* --- Code Input and Check Button --- */}
                <div className='flex gap-2'></div>
            <input
                type="text"
                placeholder="6 Digit Alpha-Numeric Code"
                maxLength={6}
                value={joinCode}
               onChange={(e) => {
                            setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                            // Clear state whenever code is typed
                            setFoundLeague(null);
                            setShowJoinConfirmation(false);
                            setShowJoinSuccess(false);
                            setMessage(null);
                        }}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 border-none uppercase tracking-widest"
                disabled={isLoading || foundLeague}
            />
            
            {foundLeague && (
                <div className="p-4 bg-gray-700 border border-green-500 rounded-lg space-y-2">
                    <p className='text-sm text-green-400 font-semibold'>League Found:</p>
                    <h3 className="text-xl font-bold text-white">{foundLeague.name}</h3>
                    <p className="text-xs text-gray-400">{foundLeague.description}</p>
                    <p className="text-xs text-gray-400 mt-2">Current Members: **{foundLeague.member_count}**</p>
                </div>
            )}
            
            {!foundLeague ? (
                <button 
                    onClick={handleJoinCheck}
                    className="w-full py-3 bg-yellow-500 text-gray-900 font-bold rounded-xl hover:bg-yellow-400 transition disabled:opacity-50"
                    disabled={isLoading || joinCode.length !== 6 || foundLeague !== null}
                >
                   {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
            ) : (
                <button 
                                                // This button now triggers the Confirmation Pop-up instead of directly joining
                            onClick={() => setShowJoinConfirmation(true)}
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-50 shadow-lg shadow-green-600/30"
                            disabled={isLoading}
                        >
                            Confirm Join
                </button>
            )}
            </div>
        );
     };

    // SECTION 3: The Main Modal/Form Rendering (JSX) - Global Wrapper
    // Note: The two check/success/confirmation popups (1 & 2 above) completely replace the content of this
    // inner div when their respective conditions are met.
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex justify-center items-center p-4 z-50">
            <div className="bg-gray-800 p-6 rounded-3xl w-full max-w-lg shadow-2xl space-y-6 transform transition-all">

                {/* Header (Hidden if success/confirmation popups are active, as they have their own content) */}
                {!showJoinConfirmation && !showJoinSuccess && (
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-extrabold text-white">
                            {type === 'create' ? 'Create New League' : 'Join Existing League'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition p-2 rounded-full hover:bg-gray-700"
                        >
                            <X size={24} />
                        </button>
                    </div>
                )}
                
                {/* --- Tab Selector (Added for context) --- */}
                {!showJoinConfirmation && !showJoinSuccess && (
                    <div className="flex bg-gray-700 rounded-xl p-1">
                        <button
                            onClick={() => setType('create')}
                            className={`flex-1 py-2 rounded-lg font-semibold transition ${type === 'create' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setType('join')}
                            className={`flex-1 py-2 rounded-lg font-semibold transition ${type === 'join' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                        >
                            Join
                        </button>
                    </div>
                )}


                {/* --- Form Rendering --- */}
                {type === 'create' ? renderCreateForm() : renderJoinForm()}

                {/* --- Message Box (Only shown if not in confirmation/success views) --- */}
                {message && !showJoinConfirmation && !showJoinSuccess && (
                    <div className={`p-4 rounded-xl text-center text-sm font-medium transition-all duration-300 ${
                        isSuccess ? 'bg-green-900/50 text-green-300 border border-green-600' : 'bg-red-900/50 text-red-300 border border-red-600'
                    }`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};


// --- LEAGUE DETAILS PAGE COMPONENTS ---

const RankIndicator = ({ rankChange }) => {
    if (rankChange > 0) {
        return <ArrowUp size={16} className="text-green-500 ml-1 flex-shrink-0" />;
    }
    if (rankChange < 0) {
        return <ArrowDown size={16} className="text-red-500 ml-1 flex-shrink-0" />;
    }
    return <Minus size={16} className="text-gray-400 ml-1 flex-shrink-0" />;
};

const StandingsTab = ({ league }) => (
    <div className="space-y-4">
        <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">The Competition</h3>
        
        {/* Standings List */}
        <div className="space-y-3">
            {league.members.sort((a, b) => a.rank - b.rank).map((member) => (
                <div key={member.username} className={`p-3 rounded-xl flex items-center justify-between ${member.isMe ? 'bg-indigo-900 border border-indigo-500 shadow-lg' : 'bg-gray-800 border border-gray-700'}`}>
                    {/* Rank & Momentum */}
                    <div className="flex items-center w-1/4">
                        <span className="text-2xl font-extrabold text-yellow-400 mr-2">#{member.rank}</span>
                        <RankIndicator rankChange={member.rankChange} />
                    </div>
                    
                    {/* User Info */}
                    <div className="flex items-center flex-grow">
                        <img src={member.avatarUrl} alt={member.username} className="w-8 h-8 rounded-full object-cover mr-3 border-2 border-gray-600"/>
                        <span className={`font-semibold ${member.isMe ? 'text-yellow-300' : 'text-white'}`}>{member.username}</span>
                    </div>

                    {/* Total Points */}
                    <div className="text-right w-1/4">
                        <span className="text-lg font-bold text-green-400">{member.points.toLocaleString()}</span>
                        <p className="text-xs text-gray-400">Pts</p>
                    </div>
                </div>
            ))}
        </div>

        <button className="w-full py-3 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition flex items-center justify-center mt-6">
            <ListOrdered size={18} className="mr-2"/> Export Standings to Sheets
        </button>
    </div>
);

const ProgressScheduleTab = ({ league }) => {
    const timeRemaining = useTimeRemaining(league.endDate);
    const isEnded = timeRemaining === 0;

    const gameWeekStatus = `Game Week ${league.currentGameWeek} / ${league.totalWeeks}`;
    const progressPercent = (league.currentGameWeek / league.totalWeeks) * 100;

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">The Timeline</h3>
            
            {/* League Progress Bar */}
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-md">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-300">League Progress</p>
                    <p className="text-sm font-bold text-indigo-400">{gameWeekStatus}</p>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                        className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000" 
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            </div>

            {/* Countdown / Winner */}
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-md text-center">
                {isEnded ? (
                    <div className="flex flex-col items-center">
                        <Trophy size={32} className="text-yellow-500 mb-2"/>
                        <p className="text-lg text-gray-300">Final Winner:</p>
                        <h4 className="text-3xl font-extrabold text-yellow-400">{league.winner}</h4>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <Clock size={32} className="text-red-500 mb-2 animate-pulse"/>
                        <p className="text-lg text-gray-300">League Ends In:</p>
                        <h4 className="text-3xl font-extrabold text-white">{formatTime(timeRemaining)}</h4>
                    </div>
                )}
            </div>

            {/* Recent Results */}
            <h4 className="text-lg font-bold text-gray-200 mt-6 border-b border-gray-700 pb-1">Recent Results</h4>
            <div className="space-y-2">
                {league.recentResults.map((result, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-400">Game Week {result.week}</p>
                        <div className="text-right">
                            <p className="text-white font-semibold">{result.topScorer}</p>
                            <p className="text-xs text-green-400">{result.score.toLocaleString()} Pts</p>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full py-3 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition flex items-center justify-center mt-6">
                <ListOrdered size={18} className="mr-2"/> Export Full Schedule
            </button>
        </div>
    );
};

const InfoSettingsTab = ({ league }) => {
    const [copyMessage, setCopyMessage] = useState('');

    const handleCopyCode = () => {
        // Use modern clipboard API or fallback
        if (navigator.clipboard) {
            navigator.clipboard.writeText(league.code).then(() => {
                setCopyMessage('Code copied!');
                setTimeout(() => setCopyMessage(''), 2000);
            });
        } else {
            // Fallback for older browsers (or if running in restrictive iframe)
            const el = document.createElement('textarea');
            el.value = league.code;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopyMessage('Code copied!');
            setTimeout(() => setCopyMessage(''), 2000);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Administration</h3>

            {/* League Code */}
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-md flex flex-col items-center space-y-3">
                <p className="text-sm font-semibold text-gray-400">Invite Code</p>
                <h4 className="text-5xl font-extrabold text-yellow-400 tracking-widest">{league.code}</h4>
                <button 
                    onClick={handleCopyCode}
                    className="flex items-center justify-center py-2 px-6 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
                >
                    <Clipboard size={18} className="mr-2"/> {copyMessage || 'Copy Code'}
                </button>
            </div>

            {/* Key Dates */}
            <h4 className="text-lg font-bold text-gray-200 mt-6 border-b border-gray-700 pb-1 flex items-center"><Calendar size={16} className="mr-2 text-indigo-400"/> Key Dates</h4>
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-800 rounded-lg text-center">
                    <p className="text-xs text-gray-400">Start Date</p>
                    <p className="text-sm font-semibold text-white">{new Date(league.startDate).toLocaleDateString()}</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg text-center">
                    <p className="text-xs text-gray-400">End Date</p>
                    <p className="text-sm font-semibold text-white">{new Date(league.endDate).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2 p-3 bg-gray-800 rounded-lg text-center">
                    <p className="text-xs text-gray-400">Total Game Weeks</p>
                    <p className="text-sm font-semibold text-white">{league.totalWeeks}</p>
                </div>
            </div>

            {/* Member List */}
            <h4 className="text-lg font-bold text-gray-200 mt-6 border-b border-gray-700 pb-1 flex items-center"><Users size={16} className="mr-2 text-indigo-400"/> Members ({league.members.length})</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                {league.members.map((member) => (
                    <div key={member.username} className="flex justify-between items-center p-2 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-center">
                            <img src={member.avatarUrl} alt={member.username} className="w-6 h-6 rounded-full object-cover mr-2"/>
                            <span className={`text-sm ${member.isMe ? 'text-yellow-300 font-bold' : 'text-white'}`}>{member.username}</span>
                            {member.rank === 1 && <Trophy size={14} className="ml-2 text-yellow-500"/>}
                        </div>
                        
                        {/* Admin Actions (Owner Only) */}
                        {league.isOwner && !member.isMe && (
                            <button className="text-red-400 hover:text-red-500 transition p-1 rounded-full bg-gray-700">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Admin Actions (Owner Only) */}
            {league.isOwner && (
                <div className="pt-4 space-y-3 border-t border-gray-700 mt-6">
                    <h4 className="text-lg font-bold text-red-300">Owner Actions</h4>
                    
                    {/* Edit Details */}
                    <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex items-center justify-center">
                        <Edit size={18} className="mr-2"/> Edit League Details
                    </button>

                    {/* Restart League (Appears ONLY if league is ended) */}
                    {league.isEnded ? (
                        <button className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition flex items-center justify-center">
                            <RotateCcw size={18} className="mr-2"/> Restart League (Reset Standings)
                        </button>
                    ) : (
                        <div className="p-3 bg-yellow-900 text-yellow-300 text-sm rounded-lg flex items-center">
                            <AlertTriangle size={18} className="mr-2"/> Restart option appears when the league ends.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const LeagueDetailsPage = ({ leagueId, onBack, userId }) => {
    const league = MOCK_LEAGUE_DETAILS_DATA[leagueId] || MOCK_LEAGUE_DETAILS_DATA[1]; // Load mock details

    const [activeTab, setActiveTab] = useState('standings'); // standings, progress, info

    const renderTabContent = () => {
        switch (activeTab) {
            case 'standings':
                return <StandingsTab league={league} />;
            case 'progress':
                return <ProgressScheduleTab league={league} />;
            case 'info':
                return <InfoSettingsTab league={league} />;
            default:
                return null;
        }
    };

    const tabClasses = (tab) => 
        `flex-1 py-3 text-sm font-bold rounded-t-lg transition-colors ${
            activeTab === tab 
                ? 'bg-gray-800 text-yellow-400 border-b-4 border-yellow-400' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`;

    return (
        <div className="min-h-screen bg-gray-900 max-w-2xl mx-auto font-sans">
            {/* Header */}
            <header className="sticky top-0 bg-gray-900/95 backdrop-blur-sm p-4 border-b border-gray-800 z-10">
                <button 
                    onClick={onBack} 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 text-white hover:text-yellow-400 transition"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-extrabold text-white text-center truncate px-10">{league.name}</h1>
                <p className="text-xs text-gray-500 text-center">{league.description}</p>
            </header>

            {/* Tab Bar */}
            <div className="flex bg-gray-900 border-b border-gray-700 sticky top-[68px] z-10 text-center">
                <button onClick={() => setActiveTab('standings')} className={tabClasses('standings')}>
                    <ListOrdered size={16} className="inline mr-1"/> Standings
                </button>
                <button onClick={() => setActiveTab('progress')} className={tabClasses('progress')}>
                    <Clock size={16} className="inline mr-1"/> Timeline
                </button>
                <button onClick={() => setActiveTab('info')} className={tabClasses('info')}>
                    <Settings size={16} className="inline mr-1"/> Info
                </button>
            </div>

            {/* Content Area */}
            <main className="p-4 pt-6 pb-20">
                {renderTabContent()}
            </main>
        </div>
    );
};

// Custom Hook to manage countdown timer
const useTimeRemaining = (endDateStr) => {
    const [time, setTime] = useState(() => calculateTimeRemaining(endDateStr));

    useEffect(() => {
        if (time <= 0) return;

        const interval = setInterval(() => {
            setTime(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [endDateStr, time]);

    return time;
};


// --- LEAGUE MAIN APP COMPONENT ---

const LeaguePage = () => {
    // League Hub States
    const [userLeagues, setUserLeagues] = useState(MOCK_LEAGUES);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Navigation State
    const [selectedLeague, setSelectedLeague] = useState(null); // Holds the ID of the selected league

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

    // User ID context
    const { id: userId, source: userIdSource } = useMemo(() => getUserId(), []);

    // Function to simulate refreshing user leagues (called after creation/joining)
    const refreshLeagues = useCallback(() => {
        // In a full application, this would call GET /api/leagues/my to fetch the list from MongoDB
        console.log(`Leagues refreshed! (Simulating GET /api/leagues/my for user ${userId})`);
        
        // Simulating the addition of a new league:
        setUserLeagues(prev => [
            ...prev.filter(l => l.id < 100), // Remove previous simulated leagues
            { 
                id: Math.random(), 
                name: "New League (Simulated)", 
                description: "Just created! Tap the chevron to view details.", 
                isOwner: true, 
                rank: 99, 
                points: 0, 
                members: 1 
            }
        ]);
    }, [userId]);

    // Debounced Search Effect for GET /api/league/search
    useEffect(() => {
        if (!searchTerm || searchTerm.length < 3) {
            setSearchResults([]);
            return;
        }

        const handler = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Calls the GET /api/league/search route
                const results = await searchPublicLeagues(searchTerm);
                setSearchResults(results);
            } catch (e) {
                console.error("Search failed:", e);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500); // 500ms debounce delay

        return () => clearTimeout(handler);
    }, [searchTerm]);


    const renderLeagueCard = (league) => (
        <div 
            key={league.id} 
            className="bg-gray-800 p-4 rounded-xl shadow-md border border-gray-700 flex justify-between items-center transition hover:bg-gray-700"
        >
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center">
                    <h3 className="text-lg font-bold text-white mr-2 truncate">{league.name}</h3>
                    {league.isOwner && (
                        <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Owner</span>
                    )}
                </div>
                <p className="text-xs text-gray-400 mb-2 truncate">{league.description}</p>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-300 mt-1">
                    <div className="flex items-center"><ListOrdered size={14} className="text-green-400 mr-1" /> Rank: <span className="font-semibold ml-1">#{league.rank || 'N/A'}</span></div>
                    <div className="flex items-center"><Star size={14} className="text-yellow-400 mr-1" /> Pts: <span className="font-semibold ml-1">{league.points?.toLocaleString() || '0'}</span></div>
                    <div className="flex items-center"><Users size={14} className="text-red-400 mr-1" /> {league.members || 0}</div>
                </div>
            </div>
            <button 
                onClick={() => setSelectedLeague(league.id)} // Set the league ID for navigation
                className="p-2 ml-4 text-indigo-400 bg-gray-700 rounded-full hover:bg-indigo-600 hover:text-white transition flex-shrink-0"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
    
    // Renders the main League Hub content
    const renderLeagueHub = () => (
        <div className="min-h-screen bg-gray-900 p-4 pt-8 pb-20 space-y-6 max-w-2xl mx-auto font-sans">
            <h1 className="text-3xl font-extrabold text-white">Leagues Hub</h1>
            <p className="text-sm text-gray-500">
                **User ID ({userIdSource}):** <span className='text-xs font-mono bg-gray-700 p-1 rounded text-white'>{userId}</span> 
            </p>

            {/* Create/Join Buttons */}
            <div className="flex space-x-3">
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition flex items-center justify-center"
                >
                    <Plus size={20} className="mr-1" /> Create League
                </button>
                <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition flex items-center justify-center"
                >
                    <LogIn size={20} className="mr-1" /> Join League
                </button>
            </div>

            {/* User's Leagues List */}
            <div className="space-y-3">
                <h2 className="text-xl font-bold text-gray-200 border-b border-gray-700 pb-2 flex items-center"><Shield size={18} className="mr-2 text-indigo-400"/> My Leagues</h2>
                {userLeagues.map(renderLeagueCard)}
            </div>

            {/* Search Bar (Uses GET /api/league/search) */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search public leagues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 bg-gray-800 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 border border-gray-700"
                />
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {/* Search Results / Popular Leagues */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-200 border-b border-gray-700 pb-2 flex items-center">
                    {searchTerm ? <Search size={18} className="mr-2 text-indigo-400"/> : <Star size={18} className="mr-2 text-yellow-400"/>}
                    {searchTerm ? 'Search Results' : 'Popular Public Leagues'}
                </h2>
                
                {isSearching && <p className="text-gray-400 text-center py-4">Searching...</p>}

                {!isSearching && searchTerm && searchResults.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No public leagues found matching "{searchTerm}".</p>
                )}

                {/* Render Search Results */}
                {!isSearching && searchTerm && searchResults.map((league) => (
                    <div key={league.id} className="bg-gray-800 p-4 rounded-xl shadow-md border border-gray-700 flex justify-between items-center transition hover:bg-gray-700">
                        <div>
                            <h3 className="text-lg font-bold text-white">{league.name}</h3>
                            <p className="text-xs text-gray-400 mb-1">{league.description}</p>
                            <div className="flex space-x-3 text-xs text-gray-300 mt-1">
                                <div className="flex items-center"><Users size={12} className="text-red-400 mr-1" /> {league.members || 0} Members</div>
                                <div className="flex items-center"><Clock size={12} className="text-green-400 mr-1" /> {formatTime(league.startsIn || 86400 * 3)}</div>
                            </div>
                        </div>
                        <button 
                            className="py-2 px-4 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition"
                        >
                            Join League
                        </button>
                    </div>
                ))}

                {/* Render MOCK Popular Leagues when not searching */}
                {!searchTerm && MOCK_LEAGUES.map((league) => (
                    <div key={`pop-${league.id}`} className="bg-gray-800 p-4 rounded-xl shadow-md border border-gray-700 flex justify-between items-center transition hover:bg-gray-700">
                        <div>
                            <h3 className="text-lg font-bold text-white">{league.name}</h3>
                            <p className="text-xs text-gray-400 mb-1">{league.description}</p>
                            <div className="flex space-x-3 text-xs text-gray-300 mt-1">
                                <div className="flex items-center"><Users size={12} className="text-red-400 mr-1" /> {league.members} Members</div>
                                <div className="flex items-center"><Clock size={12} className="text-green-400 mr-1" /> Starts in {formatTime(league.startsIn || 86400)}</div>
                            </div>
                        </div>
                        <button className="py-2 px-4 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition">
                            Join League
                        </button>
                    </div>
                ))}
            </div>


            {isCreateModalOpen && (
                <Modal title="Create New League" onClose={() => setIsCreateModalOpen(false)}>
                    <LeagueForm 
                        type="create" 
                        onClose={() => setIsCreateModalOpen(false)} 
                        userId={userId}
                        refreshLeagues={refreshLeagues}
                    />
                </Modal>
            )}

            {isJoinModalOpen && (
                <Modal title="Join Private League" onClose={() => setIsJoinModalOpen(false)}>
                    <LeagueForm 
                        type="join" 
                        onClose={() => setIsJoinModalOpen(false)} 
                        userId={userId}
                        refreshLeagues={refreshLeagues}
                    />
                </Modal>
            )}
            
            <div className="h-16"></div>
        </div>
    );
    
    // Main render logic: switch between Hub and Details
    return selectedLeague ? (
        <LeagueDetailsPage 
            leagueId={selectedLeague} 
            onBack={() => setSelectedLeague(null)} 
            userId={userId}
        />
    ) : (
        renderLeagueHub()
    );
};


// ----------------------------------------------------
// TOURNAMENT PAGE
// ----------------------------------------------------
const TournamentPage = () => (
    <div className="min-h-screen bg-gray-900 p-4 pt-8 pb-20 flex flex-col items-center justify-center text-center">
        <div className="bg-indigo-600/20 border-2 border-indigo-500 p-8 rounded-3xl shadow-2xl max-w-sm">
            <Trophy size={64} className="text-yellow-400 mx-auto mb-4 animate-bounce-slow" />
            <h1 className="text-3xl font-extrabold text-white mb-3">Tournaments</h1>
            <p className="text-lg font-semibold text-gray-200">
                Earn cash rewards by competing in weekly global tournaments.
            </p>
            <div className="mt-6 text-2xl font-black text-yellow-300 p-3 bg-indigo-700 rounded-xl shadow-inner">
                COMING SOON...
            </div>
        </div>
        <div className="h-16"></div>
    </div>
);


// ----------------------------------------------------
// PROFILE PAGE
// ----------------------------------------------------
const ProfilePage = ({ userData }) => {
    const renderTask = (task) => (
        <div key={task.name} className="flex justify-between items-center bg-gray-700 p-3 rounded-xl shadow-inner transition hover:bg-gray-600">
            <div className="flex items-center">
                {task.icon}
                <span className="text-base text-white ml-3">{task.name}</span>
            </div>
            <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-yellow-400 flex items-center">
                    <Star size={14} className="mr-1" /> {task.points.toLocaleString()}
                </span>
                <button className="py-1 px-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">
                    {task.action}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 p-4 pt-8 pb-20 space-y-6">
            
            {/* User Info */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700 flex items-center">
                <img 
                    src={userData.avatarUrl} 
                    alt="User Avatar" 
                    className="w-16 h-16 rounded-full border-4 border-indigo-500 object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x100/1e293b/94a3b8?text=AF" }}
                />
                <div className="ml-4">
                    <h1 className="text-2xl font-extrabold text-white">{userData.name}</h1>
                    <p className="text-sm text-gray-400">{userData.username}</p>
                    <p className="text-sm font-medium text-yellow-400 mt-1">Total Score: {userData.overallScore.toLocaleString()}</p>
                </div>
            </div>

            {/* Tasks Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-200 border-b border-gray-700 pb-2 flex items-center"><Check size={20} className="mr-2 text-green-400"/> Today's Tasks</h2>
                <div className="space-y-3">
                    {MOCK_TASKS.map(renderTask)}
                </div>
            </div>

            {/* Logout (Mocked) */}
            <button className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition flex items-center justify-center mt-8">
                <X size={20} className="mr-2" /> Logout (Mock)
            </button>
            
            <div className="h-16"></div>
        </div>
    );
};


//----------------------------------------------------
// MAIN APP COMPONENT
// ----------------------------------------------------
const App = () => {
       // Determine the user ID source (Telegram or Mock) on load
    const { id: userId, source: userIdSource } = getUserId();

    const [currentPage, setCurrentPage] = useState('home');
    const [userData, setUserData] = useState(MOCK_USER);
    // GameState: 'start', 'active', 'finished', 'expired'
    const [quizState, setQuizState] = useState({ status: 'start', results: null });

    // Mock function to simulate score update
    const overallScoreUpdater = useCallback((points) => {
        setUserData(prev => ({
            ...prev,
            overallScore: prev.overallScore + points,
        }));
    }, []);

    // Function passed to QuizPage to finalize results
    const finishQuiz = useCallback((results) => {
        setQuizState({ status: 'finished', results });
    }, []);

    const renderContent = () => {
        if (quizState.status === 'active') {
            return <QuizPage 
                questions={MOCK_QUESTIONS} 
                finishQuiz={finishQuiz}
                overallScoreUpdater={overallScoreUpdater}
            />;
        }

        switch (currentPage) {
            case 'home':
                return <HomePage 
                    userData={userData} 
                    setGameState={status => setQuizState(prev => ({ ...prev, status }))}
                    quizConfig={MOCK_QUIZ_CONFIG}
                    quizState={quizState}
                    overallScoreUpdater={overallScoreUpdater}
                    setPage={setCurrentPage} // Pass down page switching function
                />;
            case 'league':
                return <LeaguePage />;
            case 'tournament':
                return <TournamentPage />;
            case 'profile':
                return <ProfilePage userData={userData} />;
             case 'leaderboard':
                return <GlobalLeaderboard setPage={setCurrentPage} />;
            default:
                return null;
          
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 font-['Inter'] relative">
            <style>{`
                /* Font import for Inter */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
                
                /* Global Dark Theme Background & Scroll Padding */
                .min-h-screen {
                    min-height: 100vh;
                    padding-bottom: 64px; /* Space for the fixed bottom nav */
                }
                
                /* Custom Animation for Modals */
                @keyframes slide-up {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out forwards;
                }
                
                /* Slow bounce for tournament icon */
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(-5%); }
                    50% { transform: translateY(0); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s infinite;
                }
            `}</style>

            <div className="max-w-xl mx-auto">
                {renderContent()}
            </div>
            
            {/* Only show navigation when not in an active quiz */}
            {quizState.status !== 'active' && (
                <BottomNav currentPage={currentPage} setPage={setCurrentPage} />
            )}
        </div>
    );
};

export default App;
