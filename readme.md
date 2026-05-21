# 🏢 Campus Smart City API
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![REST API](https://img.shields.io/badge/API-REST-blue?style=flat-square)](#)

> [cite_start]A backend solution inspired by **SDG 11** to report, track, and monitor infrastructure and maintenance issues at the ESMAD Campus[cite: 16, 20].

---

### 📖 The Mission
[cite_start]This API serves as the core backend for a platform where the academic community can report campus occurrences (e.g., waste, broken lighting, accessibility barriers).
[cite_start]It replaces informal reporting with a structured workflow that tracks issue lifecycles and generates public statistical data to support decision-making

### 👥 Role Architecture
The system dynamically adapts to three distinct user access levels:
* [cite_start]**Students/Faculty:** Can log new occurrences (with descriptions, locations, and photos), comment on open issues, and edit/delete their own reports
* [cite_start]**Staff:** Responsible for updating issue statuses, logging maintenance procedures, and adjusting priorities manually or via automated API metrics
* [cite_start]**Admin:** Oversees the platform by validating staff accounts, managing user suspensions, deleting content, and configuring system categories/statuses

---

### 🛠️ Tech Stack & Rules
* [cite_start]**Core:** Node.js + Express.js
* [cite_start]**Database:** MySQL (via Sequelize)
* [cite_start]**Specs:** Follows strict REST principles, communicates via JSON, and includes Swagger/Postman docs

---