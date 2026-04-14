# Plan Rozwoju i Ulepszeń Wtyczki (YouTube Activity Cleaner)

Ten dokument zawiera plan wdrożenia nowych celów usuwania oraz ulepszeń w kodzie wtyczki, podzielony na pojedyncze kroki.

## 1. Nowe cele (Targets) do dodania

Obecnie wtyczka wspiera `comments`, `commentLikes` i `likes` (liked videos). Poniżej lista nowych, proponowanych podstron do zautomatyzowania:

- [x] **Polubienia komentarzy (Comment Likes):**
  - Dodanie obsługi dla zakładki My Activity: `https://myactivity.google.com/page?page=youtube_comment_likes`.
  - Powinno korzystać z takiej samej logiki jak zwykłe komentarze.
- [x] **Wiadomości na Czacie na Żywo (Live Chat Messages):**
  - Dodanie obsługi logiki dla: `https://myactivity.google.com/page?page=youtube_live_chat`.
- [ ] **Playlista "Do Obejrzenia" (Watch Later):** 
  - Dodanie obsługi do `targets.js` dla urla: `https://www.youtube.com/playlist?list=WL`. 
  - Logika zbliżona do modułu "Likes".
- [ ] **Masowe odsubskrybowanie kanałów (Mass Unsubscribe):** 
  - Skrypt do automatycznego odklikiwania „Odsubskrybuj” wszystkich subskrybowanych kanałów na `https://www.youtube.com/feed/channels`.
- [ ] **Zarządzanie historią oglądania i wyszukiwania:** 
  - Alternatywa dla wbudowanego czyszczenia Google, pozwalająca na selektywne usuwanie historii (np. historia `https://myactivity.google.com/activitycontrols/youtube` czy wpisy we własnej karcie Społeczność `https://myactivity.google.com/page?page=youtube_community_posts`).

## 2. Ulepszenia w silniku skryptu (Engine & Quality of Life)

Proponowane modyfikacje mające poprawić "ludzkość" skryptu oraz dodać nowe, zaawansowane narzędzia dla użytkownika:

- [ ] **Dodanie losowości w przerwach (Jitter):** 
  - Aktualizacja w module `engine.js` / opóźnieniach.
  - Zamiast sztywnych czasów przerw (np. `betweenItemsMs: 3200`), wprowadzić losowy jitter (np. stała 3200ms + losowana wartość 0 - 800ms) aby chociaż trochę zasymulować ludzkie klikanie.
- [ ] **Tryb Symulacji (Dry Run / Test):** 
  - Wdrożenie trybu polegającego tylko na skanowaniu w dół strony (bez strzelania komendami `click()`).
  - Podświetlanie ramkami CSS elementów kandydujących do usunięcia.
  - Wyświetlenie podsumowania/licznika z symulacji.
- [ ] **Filtrowanie zawartości po słowie:** 
  - Dodanie do menu pop-up wtyczki pola np. `Wyszukaj tylko tekst/tytuł`.
  - Aktualizacja `strategy.js` o weryfikację tekstu w danym rzędzie przed aktywacją logiki usuwania.
- [ ] **Wygodne wznawianie (Pause/Resume):** 
  - Rozszerzenie obecnie ubogiej obsługi zatrzymywania (`stopRequested = true`) o stan Pauzy, który nie zresetuje całkowicie cyklu.
  - Przydatne przy usuwaniu tysięcy wpisów, gdzie nagle trzeba tymczasowo wstrzymać pracę maszyny.

## 3. Ważne modyfikacje architektury UI (Dla przyszłego Agenta)

- [x] **Dynamiczne renderowanie menu GUI (Pop-up):**
  - **Problem:** Obecnie przyciski skrótów w pliku `popup/popup.html` (sekcja `<div class="quick-links">`) są dodane na tzw. "sztywno". Dodanie każdego nowego obsługiwanego linku wymagałoby ręcznej ingerencji w 3 plikach naraz (nowy tag `<button>` w HTML, definicja w `constants.js` oraz przypinanie zdarzeń click() w `popup/index.js`).
  - **Zadanie:** Należy przeprowadzić refaktoring w pliku `popup/index.js`. Pop-up powinien używać sprytnej pętli, która sama w locie przeczyta wszystkie obiekty celów pobierane z `shared.Targets` (z pliku `targets.js` należącego do logiki z tła) i dynamicznie wygeneruje te przyciski bazując na obiektach tam zapisanych.
  - **Zysk:** Znacznie mniejszy wysiłek integracji nowych funkcji – w przyszłości dodanie wsparcia dla nowego elementu ograniczy się tylko i wyłącznie do zaktualizowana słownika w pliku `targets.js`, a interfejs wtyczki sam zaktualizuje się automatycznie o nowe opcje!

## 4. Aktualny fundament pod kolejne funkcje

- [x] **Rozdzielenie strategii na rodziny przepływów:**
  - Cleaner ma już osobne pliki strategii dla My Activity delete i playlist remove.
  - Rejestr strategii jest cienką warstwą, a engine pracuje na wspólnym modelu kandydatów akcji.
- [ ] **Wykorzystać pipeline kandydatów do kolejnych funkcji:**
  - `Dry Run`: skanowanie i podświetlanie kandydatów bez `click()`.
  - filtrowanie po słowie: odsiać kandydatów przed wykonaniem akcji.
  - `Pause/Resume`: zatrzymanie/wznowienie pomiędzy etapami pipeline.
  - nowe targety: mapować je do istniejącej rodziny strategii albo dopisać nową rodzinę, jeśli lifecycle jest inny.
