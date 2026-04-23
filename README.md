# Project Overview
This repository contains the placement data management system, designed to effectively handle placement-related data for students.

## Project Structure
- **frontend/**: Contains the frontend code built using React.
- **backend/**: Contains the backend code using Express.
- **docker-compose/**: Setup for running the application using Docker.

## Dependencies
- **React**: 18
- **Express**: 4.18
- **Firebase**: 10
- **Vite**: 5
- **Node**: 20

## Firebase Setup Instructions
1. Create a Firebase project in the Firebase console.
2. Set up Firestore and Authentication as needed.
3. Add your Firebase config to the project.

## Deployment Options
- **Firebase Hosting + Cloud Run**: Deploy your frontend using Firebase Hosting and the backend via Cloud Run.
- **Vercel**: Deploy the entire project on Vercel for seamless integration.
- **Docker**: Use Docker to containerize the app for deployment.

## Comprehensive API Reference
- **GET /api/users**: Retrieve all users.
- **POST /api/users**: Create a new user.
- **GET /api/placements**: Retrieve all placements.
- **POST /api/placements**: Create a new placement.
- **GET /api/companies**: Retrieve all companies.
- **POST /api/companies**: Add a new company.
- **GET /api/reviews**: Retrieve all reviews.

## Firestore Collections Schema
- **Users**: { userId, name, email, role }
- **Placements**: { placementId, userId, company, position }
- **Companies**: { companyId, name, industry }
- **Reviews**: { reviewId, userId, feedback }

## Security Features
- Role-based access control.
- Input validation and sanitization.

## Environment Configuration Examples
```env
NODE_ENV=production
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

## NPM Scripts
- **start**: Run the app in development mode.
- **build**: Build the app for production.
- **test**: Run tests.

## Troubleshooting Guide
- Ensure that you have set up Firebase correctly.
- Check logs for errors during API requests.

## Contributing Guidelines
1. Fork the repository.
2. Create a new branch for your feature.
3. Make your changes and submit a pull request.

---
This README file serves as a comprehensive guide and is directly aligned with the actual codebase.