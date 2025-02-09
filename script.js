       // משתנים גלובליים
        let isAnnouncing = false;
        let radioVolume = 1.0;
        let wakeLock = null;
        let wakeLockInterval = null;
        let silentAudioStarted = false;
        const audioPlayer = document.getElementById('audio-player');
        const stationButtons = document.querySelectorAll('.station-button');
        let currentStationButton = null;
        const silentAudio = document.getElementById('silent-audio');
        const batteryInfo = document.getElementById('battery-info');
        let lastBatteryLevel = 100;


        // פונקציה שמקבלת מידע על סוללה
        async function updateBatteryStatus() {
            try {
                if ('getBattery' in navigator) {
                    const battery = await navigator.getBattery();
                    const level = Math.round(battery.level * 100);
                    const charging = battery.charging ? 'בטעינה' : 'לא בטעינה';
                    batteryInfo.textContent = `סוללה: ${level}%, מצב: ${charging}`;
                    
                    if (level <= 40 && lastBatteryLevel > 40) {
                        speakBatteryAlert(level);
                        lastBatteryLevel = level;
                    } else if (level <= 30 && lastBatteryLevel > 30) {
                        speakBatteryAlert(level);
                        lastBatteryLevel = level;
                    }  else if (level <= 20 && lastBatteryLevel > 20) {
                        speakBatteryAlert(level);
                        lastBatteryLevel = level;
                    } else if (level <= 10 && lastBatteryLevel > 10) {
                        speakBatteryAlert(level);
                        lastBatteryLevel = level;
                    } else if (level <= 5 && lastBatteryLevel > 5) {
                        speakBatteryAlert(level);
                        lastBatteryLevel = level;
                    } else if (level > 40 ) {
                        lastBatteryLevel = level;
                    }
                    
                    battery.addEventListener('chargingchange', () => {
                        updateBatteryStatus()
                    });
                    battery.addEventListener('levelchange', () => {
                        updateBatteryStatus()
                    });
                } else {
                    batteryInfo.textContent = 'מצב סוללה לא נתמך.';
                }
            } catch (error) {
                batteryInfo.textContent = 'שגיאה בקבלת מידע על סוללה.';
            }
        }

        // פונקציה שמבצעת קריאת התראה קולית של הסוללה ומבקשת הטענה
         async function speakBatteryAlert(level) {
            if (isAnnouncing) return;
            isAnnouncing = true;
            const wasPlaying = !audioPlayer.paused;
            const currentVolume = audioPlayer.volume;

             if (wasPlaying) {
                 await fadeAudio(audioPlayer, currentVolume, 0, 500);
             }

            const utterance = new SpeechSynthesisUtterance(`שים לב, מצב הסוללה ${level} אחוז, יש להטעין את המכשיר`);
            utterance.lang = 'he-IL';

            await new Promise(resolve => {
                 utterance.onend = resolve;
                window.speechSynthesis.speak(utterance);
            });
             if (wasPlaying) {
                 await fadeAudio(audioPlayer, 0, radioVolume, 500);
             }

             isAnnouncing = false;
        }

         // פונקציה שמבקשת להפעיל "Wake Lock" כדי לשמור את המסך פעיל
        async function requestWakeLock() {
            try {
                if ('wakeLock' in navigator && !wakeLock) {
                    wakeLock = await navigator.wakeLock.request('screen');
                    wakeLock.addEventListener('release', () => {
                         if (wakeLock) { // הבדיקה של וייק לוק עדיין קיים, ולכן ממשיכים לבקש אותו
                            requestWakeLock()
                         }
                    });
                }
            } catch (err) {
                console.log(`${err.name}, ${err.message}`);
            }
        }

         // פונקציה שמשחררת את ה "Wake Lock" ונותנת למסך לכבות
        async function releaseWakeLock(){
             if(wakeLock) {
                await wakeLock.release()
                wakeLock = null;
             }
        }

        // פונקציה שמעדכנת את השעה כל שנייה ומציגה אותה על המסך
        function updateClock() {
            const now = new Date();
            let hours = now.getHours();
            let minutes = now.getMinutes().toString().padStart(2, '0');
            document.getElementById('clock').textContent = `${hours}:${minutes}`;
        }
        setInterval(updateClock, 1000);
        updateClock();

        // פונקציה שמבצעת מעבר בין תחנות רדיו
        function switchStation(button) {
            const url = button.getAttribute('data-url');
            if (currentStationButton === button) {
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                button.classList.remove('active');
                currentStationButton = null;
                return;
            }
            audioPlayer.src = url;
            audioPlayer.volume = radioVolume;
            audioPlayer.play();
            if (currentStationButton) {
                currentStationButton.classList.remove('active');
            }
            button.classList.add('active');
            currentStationButton = button;
        }
        
         // פונקציה שמבצעת קריאת השעה בקול
        async function speakTime() {
            if (isAnnouncing) return;
            
             isAnnouncing = true;
             const wasPlaying = !audioPlayer.paused;
             const currentVolume = audioPlayer.volume;
             
            if (wasPlaying) {
                await fadeAudio(audioPlayer, currentVolume, 0, 500);
            }

            const timeString = document.getElementById('clock').textContent;
            const utterance = new SpeechSynthesisUtterance(`השעה היא ${timeString}`);
            utterance.lang = 'he-IL';
            
             await new Promise(resolve => {
                utterance.onend = resolve;
                 window.speechSynthesis.speak(utterance);
             });

            if (wasPlaying) {
                audioPlayer.volume = 0;
                await fadeAudio(audioPlayer, 0, radioVolume, 500);
            }
            
           isAnnouncing = false;
        }

         // פונקציה שמבצעת הדהייה של עוצמת הקול
        async function fadeAudio(audioElement, start, end, duration) {
            const steps = 20;
            const stepDuration = duration / steps;
            const volumeStep = (end - start) / steps;

           for (let i = 0; i <= steps; i++) {
                 audioElement.volume = start + (volumeStep * i);
                await new Promise(resolve => setTimeout(resolve, stepDuration));
            }
        }

       // פונקציה שמבצעת את הכרזת השעה באופן אוטומטי כל שעה
       function scheduleNextAnnouncement() {
            const now = new Date();
           const nextTime = new Date(now);

             //חשוב -  להגדיר גם שניות ומלישניות ל 0 כדי לקבל זמן מדוייק ללא חריגה בשניות
            nextTime.setMinutes(0, 0, 0);
           nextTime.setMilliseconds(0);
             nextTime.setHours(nextTime.getHours() + 1);

             const nextHour = nextTime.getHours();
             
             if (nextHour >= 9 && nextHour < 21) {
                let delay = nextTime.getTime() - now.getTime(); // חישוב ההפרש
                 if (delay < 0) { // אם החישוב שלילי (קורה במקרים נדירים מאוד) נגדיר ל שעה הבאה
                    nextTime.setHours(nextTime.getHours() + 1);
                      delay = nextTime.getTime() - now.getTime();
                 }

               setTimeout(() => {
                    speakTime();
                     scheduleNextAnnouncement();
                }, delay);
             } else {
                 const tomorrow = new Date(now);
                     tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                     tomorrow.setMilliseconds(0);
                const delay = tomorrow.getTime() - now.getTime();
                 setTimeout(scheduleNextAnnouncement, delay);
           }
       }

        function startKeepAwake() {
            if (!wakeLockInterval) {
                wakeLockInterval = setInterval(async () => {
                     if (wakeLock) { // אם יש וייק לוק, ממשיכים לנסות לבקש אותו
                         await requestWakeLock()
                    }
                }, 15 * 1000); // בקשה כל 15 שניות
             }
        }

        function stopKeepAwake() {
              if (wakeLockInterval) {
                clearInterval(wakeLockInterval);
                wakeLockInterval = null;
            }
         }
        
         // פונקציה לאתחול מחדש
        function restartApp() {
             window.location.reload(true);
        }
        // פעולות עם טעינת הדף
        document.addEventListener('DOMContentLoaded', async () => {
             updateBatteryStatus(); // לקריאה ראשונית של מצב הסוללה
            await requestWakeLock();
            startKeepAwake();
             if (!silentAudioStarted) {
                    silentAudio.play().then(() => {
                        silentAudio.volume = 0;
                         silentAudioStarted = true;
                     console.log("Silence track started.");
                  }).catch(error => {
                        console.error("Error playing silent track:", error);
                    });
            }
             scheduleNextAnnouncement();
            document.getElementById('clock').addEventListener('click', speakTime);
            stationButtons.forEach(button => {
                button.addEventListener('click', () => switchStation(button));
            });
            switchStation(document.getElementById('station-kan'));
            // אם האפליקציה נכנסה למצב שינה, נאתחל אותה מחדש.
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' ) {
                     if (!wakeLock) {
                         restartApp();
                    }
                }
            });
        });
