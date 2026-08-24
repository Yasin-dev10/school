"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "so";

const STORAGE_KEY = "school-language";

const somali: Record<string, string> = {
  "Overview": "Guudmarka",
  "Dashboard": "Bogga Guud",
  "People & Structure": "Dadka & Qaab-dhismeedka",
  "Students": "Ardayda",
  "Teachers": "Macallimiinta",
  "Classes": "Fasallada",
  "School Grades": "Heerarka Dugsiga",
  "Subjects": "Maaddooyinka",
  "Subject Allocation": "Qaybinta Maaddooyinka",
  "Promote Students": "Gudbinta Ardayda",
  "Teaching": "Waxbaridda",
  "Timetable": "Jadwalka",
  "Calendar & Events": "Jadwalka & Dhacdooyinka",
  "Attendance": "Xaadirinta",
  "Assignments": "Shaqo-guriga",
  "Online Learning": "Waxbarashada Online-ka",
  "Library": "Maktabadda",
  "Materials": "Agabka Waxbarashada",
  "Exams & Results": "Imtixaannada & Natiijooyinka",
  "Exams": "Imtixaannada",
  "Grade Entry": "Gelinta Dhibcaha",
  "Multi-Subject Marks": "Dhibcaha Maaddooyinka",
  "Exam Results": "Natiijooyinka Imtixaanka",
  "Combined Results": "Natiijooyinka Isku-dhafan",
  "Top Students": "Ardayda Ugu Sarreysa",
  "Grades": "Darajooyinka",
  "My Grades": "Darajooyinkayga",
  "Finance": "Maaliyadda",
  "Fees": "Lacagaha Dugsiga",
  "Fees & Finance": "Lacagaha & Maaliyadda",
  "Fee & Payment Hub": "Xarunta Lacag-bixinta",
  "Invoice Generator": "Samaynta Qaansheegta",
  "Payroll": "Mushaharooyinka",
  "Operations": "Hawlgallada",
  "Human Resources": "Shaqaalaha",
  "Inventory": "Kaydka Agabka",
  "Certificates": "Shahaadooyinka",
  "Reports": "Warbixinnada",
  "System": "Nidaamka",
  "Logs & Security": "Diiwaanka & Amniga",
  "Settings": "Dejimaha",
  "Notifications": "Ogeysiisyada",
  "About School": "Ku Saabsan Dugsiga",
  "Contact Messages": "Farriimaha Xiriirka",
  "My Classes": "Fasalladayda",
  "More": "Dheeraad",
  "Communication": "Isgaarsiinta",
  "Payslips": "Warqadaha Mushaharka",
  "My Profile": "Astaantayda",
  "Academics": "Waxbarashada",
  "Account": "Akoonka",
  "Group Menu": "Liiska Qaybaha",
  "Expand": "Fur Dhammaan",
  "Collapse": "Xir Dhammaan",
  "Logout": "Ka Bax",
  "Academic Year": "Sannad-dugsiyeedka",
  "Search group menu...": "Ka raadi liiska...",
  "Search students, records, or files...": "Raadi arday, diiwaan ama fayl...",
  "No menu items found": "Wax liis ah lama helin",
  "item": "qodob",
  "items": "qodob",
  "Help and system information": "Caawimaad iyo macluumaadka nidaamka",
  "Loading dashboard…": "Bogga guud waa la soo rarayaa…",
  "Faculty dashboard": "Bogga Macallinka",
  "Welcome back": "Soo dhowow mar kale",
  "Total Students": "Wadarta Ardayda",
  "Monthly Revenue": "Dakhliga Bishan",
  "Total Staff": "Wadarta Shaqaalaha",
  "Avg Attendance": "Celceliska Xaadirinta",
  "Add Student": "Ku Dar Arday",
  "Post Announcement": "Dir Ogeysiis",
  "Create Exam": "Samee Imtixaan",
  "Generate Report": "Samee Warbixin",
  "Recent Academic Performance": "Waxqabadka Waxbarasho ee Dhawaan",
  "View all": "Eeg Dhammaan",
  "No marks data yet": "Weli dhibco lama gelin",
  "Grade entries will appear here once exams are recorded.": "Dhibcuhu halkan ayay ka muuqan doonaan marka imtixaannada la diiwaangeliyo.",
  "Subject": "Maaddada",
  "Average Score": "Celceliska Dhibcaha",
  "Trend": "Isbeddelka",
  "Active Classes": "Fasallada Shaqaynaya",
  "Total Teachers": "Wadarta Macallimiinta",
  "Upcoming Events": "Dhacdooyinka Soo Socda",
  "No upcoming events": "Dhacdo soo socota ma jirto",
  "Scheduled exams and deadlines will show up here.": "Imtixaannada iyo waqtiyada kama dambaysta ah ayaa halkan ka muuqan doona.",
  "View all exams →": "Eeg dhammaan imtixaannada →",
  "Quick actions": "Hawlo Degdeg ah",
  "Unknown": "Aan la aqoon",
  "Loading your portal…": "Boggaaga waa la soo rarayaa…",
  "Student Portal": "Bogga Ardayga",
  "Manage your academic journey.": "La soco safarkaaga waxbarasho.",
  "Attendance Rate": "Heerka Xaadirinta",
  "Current GPA": "GPA-ga Hadda",
  "Pending Fees": "Lacagaha Dhiman",
  "Today's Classes": "Fasallada Maanta",
  "Academic Services": "Adeegyada Waxbarashada",
  "Personal Information": "Macluumaadka Shakhsiga",
  "View and update your profile details": "Eeg oo cusboonaysii xogtaada shakhsiga",
  "Attendance Records": "Diiwaanka Xaadirinta",
  "Check your attendance history and statistics": "Eeg taariikhda iyo tirakoobka xaadirintaada",
  "Academic Grades": "Darajooyinka Waxbarashada",
  "View your grades and academic performance": "Eeg darajooyinkaaga iyo waxqabadkaaga",
  "Progress Reports": "Warbixinnada Horumarka",
  "Access detailed academic reports and analytics": "Hel warbixin iyo falanqayn waxbarasho oo faahfaahsan",
  "Fee Management": "Maamulka Lacagaha",
  "Track and manage your fee payments": "La soco oo maamul lacag-bixintaada",
  "Class Timetable": "Jadwalka Fasalka",
  "View your weekly class schedule": "Eeg jadwalka fasalka ee toddobaadlaha ah",
  "Online Examinations": "Imtixaannada Online-ka",
  "Take online exams and view results": "Gali imtixaannada online-ka oo eeg natiijooyinka",
  "View institutional announcements and updates": "Eeg ogeysiisyada iyo wararka dugsiga",
  "View Reports": "Eeg Warbixinnada",
  "Up to Date": "Waxba Kama Dhina",
  "Take Exams": "Gali Imtixaannada",
  "Stay Updated": "La Soco Wararka",
  "Full Name": "Magaca oo Buuxa",
  "Email": "Iimayl",
  "Phone": "Telefoon",
  "Class": "Fasalka",
  "Date of Birth": "Taariikhda Dhalashada",
  "Address": "Cinwaanka",
  "Not provided": "Lama gelin",
  "Today's Schedule": "Jadwalka Maanta",
  "Room": "Qolka",
  "No classes today!": "Maanta fasal ma jiro!",
  "Present": "Joogay",
  "Due": "Dhimman",
  "Classes/Week": "Fasal/Toddobaad",
  "Teachers and students sign in with their generated username. Parents and staff can use email.": "Macallimiinta iyo ardaydu waxay ku galaan username-ka loo sameeyey. Waalidiinta iyo shaqaaluhu waxay isticmaali karaan iimayl.",
  "Username or email": "Username ama iimayl",
  "Password": "Furaha Sirta",
  "Enter your password": "Geli furahaaga sirta ah",
  "Hide password": "Qari furaha sirta ah",
  "Show password": "Muuji furaha sirta ah",
  "Remember me": "I xasuuso",
  "Forgot password?": "Ma ilowday furaha sirta ah?",
  "Signing in…": "Waa lagu gelinayaa…",
  "Sign in": "Gal",
  "Don't have an institution registered?": "Dugsigaagu weli ma diiwaangashana?",
  "Contact sales": "Nala soo xiriir",
  "Login failed. Please check your credentials.": "Gelitaanku wuu fashilmay. Hubi username-ka iyo furaha sirta ah.",
  "Accessibility settings": "Dejimaha fududeynta isticmaalka",
  "Accessibility": "Fududeynta Isticmaalka",
  "Text size": "Cabbirka qoraalka",
  "Decrease text size": "Yaree cabbirka qoraalka",
  "Increase text size": "Kordhi cabbirka qoraalka",
  "High contrast": "Midab kala-sooc sarreeya",
  "On": "Shidan",
  "Off": "Damsan",
  "Skip to main content": "U gudub qaybta muhiimka ah",
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  translate: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const next: Language = saved === "so" ? "so" : "en";
    setLanguageState(next);
    document.documentElement.lang = next;
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "so" : "en");
  }, [language, setLanguage]);

  const translate = useCallback(
    (text: string) => (language === "so" ? somali[text] || text : text),
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, translate }),
    [language, setLanguage, toggleLanguage, translate]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
