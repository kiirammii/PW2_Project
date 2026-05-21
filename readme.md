![Generic badge](https://img.shields.io/badge/status-%20finished-54CC74)

<div align="center">
<h1>🏢 Campus Smart City API</h1>
</div>

> A backend solution to report, track, and monitor infrastructure and maintenance issues at the ESMAD Campus.

## Autor

<table align="center" style="border: 0px">
    <tr>
        <td align="center" style="border: 0px">
        <img style="border-radius: 50%; width="100px;"" src="https://avatars.githubusercontent.com/u/115722559?v=4" width="100px;"><br>
        <sub>
        <b>Catarina Sousa</br>
        </td>
    </tr>
</table>

<hr>

### Technologies Used

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![JSON](https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

<hr>

### 📖 The Mission
This API serves as the core backend for a platform where the academic community can report campus occurrences (e.g., waste, broken lighting, accessibility barriers).
It replaces informal reporting with a structured workflow that tracks issue lifecycles and generates public statistical data to support decision-making

### 👥 Role Architecture
The system dynamically adapts to three distinct user access levels:
* **Students/Faculty:** Can log new occurrences (with descriptions, locations, and photos), comment on open issues, and edit/delete their own reports
* **Staff:** Responsible for updating issue statuses, logging maintenance procedures, and adjusting priorities manually or via automated API metrics
* **Admin:** Oversees the platform by validating staff accounts, managing user suspensions, deleting content, and configuring system categories/statuses

---

### 🛠️ Tech Stack & Rules
* **Core:** Node.js + Express.js
* **Database:** MySQL (via Sequelize)
* **Specs:** Follows strict REST principles, communicates via JSON, and includes Swagger/Postman docs

---