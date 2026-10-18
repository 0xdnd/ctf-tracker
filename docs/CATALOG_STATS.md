# סטטיסטיקות קטלוג המכונות של ZeroBox

> נכון לתאריך **2026-10-12**. הקובץ נוצר אוטומטית על ידי `npm run stats:catalog` (scripts/catalog-stats.mjs) מתוך הנתונים שב-`src/data`; אין לערוך אותו ידנית.

## תקציר

| מדד | מספר |
| --- | --- |
| סה"כ מכונות ויעדים בודדים בקטלוג | **1027** |
| מתוכן מכונות אתגר טהורות (Pure CTF Challenges) | **1027** (576 HTB + 451 THM) |
| מתוכן מעבדות מודרכות ושותפים (Guided Labs) | 0 (הוסרו כליל מהקטלוג) |
| Hack The Box (HTB) | 576 |
| מתוכן מפורשות (Retired) | 556 |
| מתוכן פעילות (Active), מטא-דאטה בלבד | 20 |
| TryHackMe (THM) | 451 |
| מעבדות ארגוניות מוגדרות מראש (HTB Pro Labs) | **10** מעבדות (170 שרתים, 280 דגלים) |

הקטלוג המובנה כולל 1,027 יעדי אתגר טהורים (איחוד של `src/data/machinesCatalog.ts` ו-`src/data/activeMachines.json`), ובנוסף 10 תבניות מוכנות מראש למעבדות ה-Pro Labs של Hack The Box (Dante, Zephyr, Offshore וכו').

## Hack The Box: פעילות, מפורשות ושורות מטא-דאטה

| קבוצה | מספר | הסבר |
| --- | --- | --- |
| מפורשות עם רשומה מלאה | 415 | תגיות, רמז, תקציר רשמי וקישור ל-writeup, כפי שמותר לתוכן מפורש (HTB AUP §8.3) |
| מפורשות, מטא-דאטה בלבד | 141 | שם, מערכת הפעלה, רמת קושי וקישור לדף המכונה בלבד |
| פעילות | 20 | שם, מערכת הפעלה, רמת קושי, תאריך שחרור וקישור בלבד (HTB AUP §8.2) |
| **סה"כ HTB** | **576** |  |

מתוך 415 הרשומות המלאות, 22 הן מעבדות Starting Point (מעבדות ההיכרות של HTB).

שורות המטא-דאטה של מכונות מפורשות נוספו כדי שהקטלוג יכלול את כל המכונות שפרשו עד היום. תאריך הפרישה אינו נשמר בקטלוג, ולכן אין כאן פילוח לפי שנת פרישה.

## פילוח לפי רמת קושי

| רמת קושי | HTB מפורשות (Retired) | HTB פעילות (Active) | THM | סה"כ |
| --- | --- | --- | --- | --- |
| Very Easy | 22 | 0 | 1 | 23 |
| Easy | 163 | 6 | 145 | 314 |
| Medium | 190 | 6 | 216 | 412 |
| Hard | 117 | 4 | 83 | 204 |
| Insane | 64 | 4 | 6 | 74 |
| **סה"כ** | **556** | **20** | **451** | **1027** |

## פילוח לפי מערכת הפעלה

| מערכת הפעלה | HTB מפורשות (Retired) | HTB פעילות (Active) | THM | סה"כ |
| --- | --- | --- | --- | --- |
| Linux | 382 | 11 | 414 | 807 |
| Windows | 162 | 9 | 35 | 206 |
| BSD | 10 | 0 | 0 | 10 |
| Other | 1 | 0 | 1 | 2 |
| Android | 1 | 0 | 0 | 1 |
| macOS | 0 | 0 | 1 | 1 |
| **סה"כ** | **556** | **20** | **451** | **1027** |

## המכונות הפעילות ב-HTB (20)

הרשימה מתעדכנת תקופתית ב-`src/data/activeMachines.json` ומכילה את מאגר 20 המכונות הפעילות ב-HTB (ראו את השדה `note` בקובץ לפרטי תאימות AUP §8.2).

| מכונה | רמת קושי | מערכת הפעלה | תאריך שחרור |
| --- | --- | --- | --- |
| Stream | Medium | Linux | 2026-10-10 |
| Touch | Easy | Windows | 2026-10-03 |
| Layover | Medium | Linux | 2026-09-26 |
| Management | Easy | Linux | 2026-09-12 |
| TrustFall | Insane | Windows | 2026-09-11 |
| Scaffold | Hard | Windows | 2026-09-05 |
| BlockSynergy | Insane | Linux | 2026-08-29 |
| DanglingTree | Medium | Windows | 2026-08-08 |
| Cohort | Easy | Linux | 2026-08-01 |
| DarkZeroReturns | Hard | Windows | 2026-07-25 |
| Bedside | Medium | Linux | 2026-07-18 |
| Paperwork | Easy | Linux | 2026-07-11 |
| MakeSense | Medium | Linux | 2026-07-04 |
| Enigma | Easy | Linux | 2026-06-27 |
| Nimbus | Hard | Linux | 2026-06-20 |
| Checkpoint | Medium | Windows | 2026-06-13 |
| Connected | Easy | Linux | 2026-06-06 |
| PingPong | Insane | Windows | 2026-04-25 |
| Garfield | Hard | Windows | 2026-04-04 |
| Eloquia | Insane | Windows | 2025-12-13 |

## מסלולי תרגול

מספר המכונות בכל מסלול, מחושב על הקטלוג כולו. מכונה פעילה לעולם אינה נכללת במסלול שמבוסס על רשימה (הכנה להסמכה או רשימה אוצרת); מסלולי רמת קושי, מערכת הפעלה וטכניקה הם מסננים בלבד ועשויים לכלול גם מכונות פעילות.

| מזהה | שם המסלול | קטגוריה | HTB | THM | סה"כ |
| --- | --- | --- | --- | --- | --- |
| `tjnull-oscp` | TJ_Null's OSCP NetSec Preparation | certification | 70 | 34 | **104** |
| `osep` | OSEP Evasion & Lateral Movement Preparation | certification | 27 | 0 | **27** |
| `oswe` | OSWE Web Exploitation & Code Review Preparation | certification | 23 | 0 | **23** |
| `cpts-path` | Certified Penetration Testing Specialist (CPTS) | certification | 49 | 2 | **51** |
| `cwee-web` | HTB CWEE & CWES Advanced Web Exploitation | certification | 76 | 7 | **83** |
| `popular-classics` | Community Classics & Hall of Fame | curated | 40 | 13 | **53** |
| `ippsec-vault` | IppSec Video Walkthrough Masterclass | curated | 447 | 0 | **447** |
| `crto-ad` | Active Directory & Red Team Warfare (CRTO) | certification | 77 | 11 | **88** |
| `web-master` | Web Exploitation Master Pathway | technique | 56 | 33 | **89** |
| `linux-privesc` | Linux Privilege Escalation Intensive | technique | 8 | 31 | **39** |
| `windows-privesc` | Windows & Enterprise PrivEsc Domination | technique | 173 | 62 | **235** |
| `beginner-essentials` | Fast Track: Easy Footholds & Essentials | level | 191 | 146 | **337** |
| `insane-hardcore` | Hardcore & Insane Challenge Track | level | 189 | 89 | **278** |

רשימות השמות של המסלולים נשמרות ב-`src/data/trackSources/` (שמות בלבד, עם תאריך ומקור):

| קובץ | תוכן | שמות | נכון ל | מקור |
| --- | --- | --- | --- | --- |
| `offsec-oscp.json` | רשימת OSCP+ (PEN-200 2023+) של 0xdf | 70 | 2026-10-12 | https://0xdf.gitlab.io/cheatsheets/offsec |
| `offsec-osep.json` | רשימת OSEP של 0xdf | 27 | 2026-10-12 | https://0xdf.gitlab.io/cheatsheets/offsec |
| `offsec-oswe.json` | רשימת OSWE של 0xdf | 23 | 2026-10-12 | https://0xdf.gitlab.io/cheatsheets/offsec |
| `htb-active-directory.json` | מכונות Active Directory ב-HTB | 84 | 2026-10-12 | https://github.com/seriotonctf/HackTheBox-AD-Machines |
| `ippsec-videos.json` | מכונות HTB עם סרטון של IppSec | 447 | 2026-10-12 | https://github.com/IppSec/ippsec.github.io (dataset.json) |

## מעבדות ארגוניות (HTB Pro Labs Presets)

מעבדות ארגוניות פעילות של Hack The Box הזמינות כתבניות מובנות ב-ZeroBox (מטא-דאטה והיקף בלבד, ללא פתרונות או הדלפות, בהתאם ל-HTB AUP §8.2):

| מעבדה | רמת קושי | שרתים | דגלים | הסמכות מקבילות |
| --- | --- | --- | --- | --- |
| [Genesis](https://app.hackthebox.com/pro-labs/Genesis) | Easy | 6 | 13 | CPTS |
| [Dante](https://app.hackthebox.com/pro-labs/Dante) | Medium | 14 | 27 | CPTS, OSCP, CRTO |
| [Zephyr](https://app.hackthebox.com/pro-labs/Zephyr) | Hard | 18 | 32 | CRTO, CPTS, OSCP |
| [Offshore](https://app.hackthebox.com/pro-labs/Offshore) | Hard | 18 | 38 | CRTO, OSCP, CRTP |
| [RastaLabs](https://app.hackthebox.com/pro-labs/RastaLabs) | Hard | 19 | 26 | CRTP, CRTO |
| [Cybernetics](https://app.hackthebox.com/pro-labs/Cybernetics) | Insane | 27 | 40 | OSEP, CRTO |
| [AptLabs](https://app.hackthebox.com/pro-labs/AptLabs) | Insane | 21 | 35 | OSEP |
| [Halcyon](https://app.hackthebox.com/pro-labs/Halcyon) | Hard | 15 | 20 | CPTS, CRTO |
| [Mayhem](https://app.hackthebox.com/pro-labs/Mayhem) | Hard | 16 | 25 | CPTS, OSCP |
| [Blizzard](https://app.hackthebox.com/pro-labs/Blizzard) | Insane | 16 | 24 | OSEP, CRTO |

## מקורות

- **0xdf hacks stuff** (https://0xdf.gitlab.io/): מערכת הפעלה ורמת קושי של מכונות HTB המפורשות שנוספו כמטא-דאטה, ורשימות OSCP / OSEP / OSWE (https://0xdf.gitlab.io/cheatsheets/offsec).
- **IppSec** (https://github.com/IppSec/ippsec.github.io, הקובץ dataset.json): המכונות שיש להן סרטון הדרכה.
- **seriotonctf/HackTheBox-AD-Machines** (https://github.com/seriotonctf/HackTheBox-AD-Machines): מכונות Active Directory.
- **מפת האתר של TryHackMe** (https://tryhackme.com/sitemaps/rooms.xml): חדרי THM.
- **צילומי מסך של לשונית Active ב-HTB** שסיפק המשתמש (2026-10-12): רשימת המכונות הפעילות.
- **Hack The Box Pro Labs Directory** (https://app.hackthebox.com/pro-labs): שמות מעבדות, מספר שרתים, דגלים וקישורים רשמיים.

## הערת תנאי שימוש

- **מכונות פעילות ו-Pro Labs:** מוצגים כמטא-דאטה והיקף בלבד (שם, מערכת הפעלה, רמת קושי, תאריך שחרור, היקף שרתים/דגלים וקישור לדף הרשמי). אין רמזים, פתרונות, דגלים, תגיות פנימיות או הערות (HTB AUP §8.2). התוכנה פועלת באופן מקומי מלא ללא טלמטריה.
- **מכונות מפורשות:** HTB AUP §8.3 מתיר הדרכות ו-writeups קהילתיים לתוכן מפורש.
- **מבחנים ומעבדות פרטיות:** המשתמש יכול ליצור מטרות אישיות משלו לפי הצורך.
