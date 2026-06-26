<div align="center">
  <img src="./public/favicon.svg" alt="Pran Logo" width="100" />
  <h1>Pran</h1>
  <p><strong>Medical Evidence Intelligence Platform</strong></p>
  <p>
    Pran synthesizes millions of data points from PubMed, ClinicalTrials.gov, and OpenFDA into chronological timelines, spatial canvases, and adversarial debates.
  </p>
</div>

---

## 🌟 Overview

Pran is a next-generation workstation designed for clinical evidence. It replaces static literature reviews and disjointed search queries with a unified, real-time intelligence engine. Search any disease, drug, or medical condition to explore its trials, guidelines, conflicts, and treatment landscape—all in one dynamic view.

**Core Philosophy:**
- **Evidence-First:** Driven exclusively by live, real-world data from verified medical databases.
- **Traceability:** Every node, paper, and trial links directly to its source.
- **Aesthetic Utility:** Information is arranged for thinking, using modern visual metaphors like spatial canvases and chronological timelines.

## ✨ Features

- **Live Database Integration:** Fetches real-time data from PubMed, ClinicalTrials.gov APIv2, and OpenFDA.
- **Spatial Evidence Board:** Visualizes papers and clinical trials in an interactive, deterministic spatial scattering algorithm.
- **Chronological Timelines:** Aggregates and sorts research history to build a unified timeline of medical advancements and trials.
- **Dynamic Contexts:**
  - **Conflicts:** Highlights terminated, suspended, or withdrawn research.
  - **Courtroom / Guidelines / Graph:** Dynamic placeholders ready for LLM synthesis and adversarial analysis.
- **Context-Aware Navigation:** Global search that instantly pivots the entire workspace to the target condition.

## 🛠️ Technology Stack

Pran is built with modern, high-performance web technologies:

- **Framework:** React 19 + TypeScript
- **Routing:** [TanStack Router](https://tanstack.com/router/latest) (File-based, fully type-safe routing)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** Tailwind CSS (Custom Design System with `ink`, `paper`, and `card` themes)
- **Data Fetching:** Native `fetch` with TanStack Route Loaders and an in-memory TTL caching layer.
- **APIs:** 
  - [PubMed E-Utilities](https://www.ncbi.nlm.nih.gov/books/NBK25500/)
  - [ClinicalTrials.gov API v2](https://clinicaltrials.gov/data-about-studies/learn-about-api)
  - [OpenFDA](https://open.fda.gov/apis/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pran.git
   cd pran
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   Navigate to `http://localhost:5173` in your browser.

## 🏗️ Architecture

- **`src/routes/`**: Contains the file-based routes managed by TanStack Router. The `topic.$topicId.*.tsx` structure enables universal data binding for any medical topic.
- **`src/components/`**: Reusable UI components. The `Workstation` component acts as the global layout shell, providing the command palette and navigation dock.
- **`src/lib/api/`**: The data layer. Abstracts complex medical APIs into a unified `LiveTopicData` contract. Features a 30-minute TTL cache to minimize redundant network requests.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License.
