# Transit Tracker

**Transit Tracker** is a React Native app designed to provide real-time tracking and prediction data for Chicago's buses and trains. The app emphasizes user customization through favorites management and offers a clean, user-friendly interface for exploring transit routes and stops.

---

## Project Overview

This project is a part-time, ongoing side project aimed at leveraging official CTA APIs to build a practical transit tracking app. It focuses on delivering live data for Chicago buses and trains, allowing users to search stops, view arrival predictions, and manage favorites for quick access.

---

## Current Features

- **Live Bus Tracking**  
  Fetches routes, stops, and real-time arrival predictions from the official CTA Bus Tracker API.

- **Favorites Management**  
  Users can favorite specific bus stops for quicker access. Favorites are persisted locally using AsyncStorage.

- **Expandable Route & Stop Views**  
  Routes and stops can be expanded/collapsed to reveal detailed arrival predictions per direction.

- **Search Functionality**  
  Search stops by name across all routes to quickly find relevant information.

- **Pull-to-Refresh**  
  Refresh predictions for all currently expanded stops with a convenient refresh button.

- **Settings Screen (Basic)**  
  Toggle notifications on/off (placeholder for future notification implementation).

---

## Project Workflow

### 1. Design Draft  

**Status:** Completed  

- Initial wireframes and UI concepts created in [Figma](https://www.figma.com/design/onlH1b1vwHpA5h8Vfznyky/Transit-Tracker?m=auto&t=dvKBLU2jwQcwI4bE-1).  
- Focus on clear, accessible UX for transit users.

### 2. React Native Prototype  

**Status:** Completed  

- Implemented core navigation and UI components.
- Created pages for Home, Trains, Busses, and Settings.

### 3. API Integration  

**Status:** Completed  

- Integrated official CTA Bus Tracker API for live route, stop, and prediction data.
  - Fetch all train stops from [City of Chicago API](https://dev.socrata.com/foundry/data.cityofchicago.org/8pix-ypme).
  - Integrate train station ETAs from [CTA Train Tracker API](https://www.transitchicago.com/developers/traintracker/)
  - Integrate bus stop ETAs form [CTA Bus Tracker API](https://www.transitchicago.com/developers/bustracker/)
- Established favorites persistence and UI updates with live data.  
- Understanding and handling asynchronous data fetching complexities.

### 4. Revision & Optimization  

**Status:** In Progress  

- Improve UI polish, caching strategies, and performance.
- Implement train tracking alongside buses.  
- Costom logging based on servity level.
- Add push notifications and dark mode.

### 5. Deployment  

**Status:** Incomplete  

- Plan for beta release and eventual App Store deployment.

---

## Resources & References

- [Dev Tools/Documentation](https://www.transitchicago.com/developers/ttdocs/)
- [City of Chicago Train Stop ID List API](https://dev.socrata.com/foundry/data.cityofchicago.org/8pix-ypme)
- [Train Tracker API](https://www.transitchicago.com/developers/traintracker/)
- [Bus Tracker API](https://www.transitchicago.com/developers/bustracker/)
- [CTA4J Website](https://cta4j.app)
- [CTA4J Repo](https://github.com/lbkulinski/CTA4j)
- [CTA API Wrapping Youtube](https://www.youtube.com/watch?v=yE6X4wWwyHM)
- [React Native Vector Icons](https://github.com/oblador/react-native-vector-icons)
- [React Native Logging Practices](https://medium.com/vectoscalar/react-native-logs-best-practices-3d271a20b541)

---

### Notes

- Migrate to Expo Dev New Architecture (SDK 52 or later)
- Now migrated to Expo SDK 54.0.0
- This is an ongoing personal side project developed in spare time
- The app prioritizes functional completeness and learning over full production polish

---

## License

- This project is for personal and educational use.

---

Developed by Henry Barber and Connor Hughes, with the help of Neev Agrawal.
Feel free to reach out or contribute ideas!
