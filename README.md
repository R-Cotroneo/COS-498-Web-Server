# COS-498-Final-Project

This is the upgraded version of the forum that was built for COS_498_MidTerm_Forum.  It is essentially a fork of that project with a lot of improvements, mainly surrounding security.

## Features

- **User Authentication**: Login and registration system with session management
- **Forum Posts**: Create, view, and manage forum discussions
- **Responsive Design**: Mobile-friendly interface with modern styling
- **Categories**: Organize posts by different categories
- **Real-time Updates**: View recent activity and discussions
- **Containerized**: Docker-based deployment for easy setup
- **User Profiles0**: Profiles that are stored with usernames, emails, password, and display names
- **Minor User Customization**: Display names can be edited as well as changing the color of the nameplate
- **Improved Security**: Login attempts are tracked with lockout upon too many attempts, resetting password is possible, passwords must adhere to strength requirements, emails and usernames must be unique
- **Live Chat**: A Socket IO chat has now been added which allows users to chat in real time
- **Markdown Support (Comments)**: Users can now use markdown formatting in comments (does not work in live chat)

## Tech Stack

- **Backend**: Node.js with Express.js framework, sqlite3 database
- **Templating**: Handlebars (HBS) for server-side rendering
- **Styling**: Custom CSS with responsive design
- **Session Management**: Express-sessions stored in sqlite3 database
- **Reverse Proxy**: Nginx for load balancing and static file serving
- **Containerization**: Docker and Docker Compose
- **Socket IO**: Socket IO API for chat feature

## Project Structure

```
COS-498-Web-Server/
├── be/
│   ├── config/
│   │   └── email.js                # Emailing Configuration
│   ├── db/
│   │   └── finalapp.db             # Database for the app
│   ├── middleware/
│   │   ├── database.js             # Database module
│   │   ├── loginTracker.js         # Login Attempt Tracking module
│   │   ├── markdown.js             # Markdown Support module
│   │   ├── pass-utils.js           # Password, Email, and Username Validation (also password hashing) module
│   │   ├── passwordResetEmail.js   # Password Reset Emailing module
│   │   └── router.js               # Application Router module
│   ├── views/
│   │   ├── home.hbs                # Homepage template
│   │   ├── login.hbs               # Login page template
│   │   ├── register.hbs            # Registration page template
│   │   ├── comments.hbs            # Forum posts listing
│   │   ├── new-comment.hbs         # New post creation form
│   │   └── partials/
│   │       ├── header.hbs          # Navigation header
│   │       └── footer.hbs          # Footer component
│   ├── Dockerfile                  # Node.js container setup
│   ├── package-lock.json           # Node.js dependencies
│   ├── package.json                # Node.js dependencies
│   └── server.js                   # Main application server
│   
├── fe/
│   ├── public/
│   │   └── style.css               # CSS Style Sheet
│   ├── default.conf                # Nginx configuration
│   └── Dockerfile                  # Nginx container setup
│   
├── docker-compose.yml              # Docker services configuration
└── README.md                       # This file
```

## Getting Started

### Prerequisites

Make sure you have the following installed on your system:

- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)

### Node Dependencies

Use ```npm install {module-name}``` on these dependencies:
- argon2
- better-sqlite3
- dompurify
- express
- express-session
- hbs
- jsdom
- marked
- nodemailer
- socket.io

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/R-Cotroneo/COS-498-MidTerm-Forum.git
   cd COS-498-MidTerm-Forum
   ```

2. **Start the application:**
   ```bash
   docker compose up -d --build
   ```

   This command will:
   - Build the Docker images for both services
   - Start the Node.js backend server
   - Start the Nginx reverse proxy
   - Set up the internal network communication

3. **Access the application:**
   
   Open your web browser and navigate to:
   ```
   https://final.raistcotroneo.com
   ```

   The forum should now be accessible and fully functional!

## Usage

### Navigation

- **Home Page** (`/`): Welcome page with recent activity
- **All Posts** (`/comments`): View all forum discussions
- **Login** (`/login`): User authentication
- **Register** (`/register`): Create new user account
- **New Post** (`/new-comment`): Create forum posts (requires login)
- **Chat** (`/chat`): Online chat (requires login)
- **User Profile** (`/profile`): User's profile page
- **Reset Password** (`/reset-password-email`): Steps to reset the user's password

### User Features

1. **Registration**: Create an account with username, email, password, and display name
2. **Login**: Authenticate with username/email and password
3. **Post Creation**: Write new forum posts with titles and content
4. **Browse Posts**: View all discussions with sorting options
5. **Online Chat**: Chat with other users online
6. **Profile Customization**: Customize your displayed name and its color
7. **Reset Password**: If you forget your password, you can now reset it

## Database Schema

The application uses SQLite3 with the following table structure:

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    name_color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
```

### Comments Table
```sql
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT DEFAULT '[DELETED USER]',
    comment TEXT NOT NULL,
    comment_html TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author) REFERENCES users(username)
        ON DELETE SET DEFAULT
        ON UPDATE CASCADE
);
```

### Login Attempts Table
```sql
CREATE TABLE login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    username TEXT NOT NULL,
    attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    success INTEGER DEFAULT 0
);
```

### Password Reset Table
```sql
CREATE TABLE password_reset (
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL PRIMARY KEY,
    expires_at INTEGER
);
```

### Chat Messages Table
```sql
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    message TEXT NOT NULL,
    name_color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
```

### Table Descriptions

- **users**: Stores user account information including authentication data and profile customization
- **sessions**: Manages active user sessions for login state persistence
- **comments**: Forum posts with both raw markdown (`comment`) and rendered HTML (`comment_html`)
- **login_attempts**: Tracks login attempts for security monitoring and rate limiting
- **password_reset**: Temporary tokens for password reset functionality
- **chat_messages**: Real-time chat messages with user display preferences

## Configuration

### Environment Variables

The application uses the following environment variables:

- `NODE_ENV`: Set to `production` in containers
- `PORT`: Internal port for Node.js server (default: )
- `GMAIL_USER`: Gmail account for email service
- `GMAIL_APP_PASSWORD`: App password for email service

### Ports

- **External Access**: Port 7979 (HTTP)
- **Internal Node.js**: Port 4610
- **Nginx**: Port 7979 (container)

## Nginx Proxy Manager Setup

The application uses Nginx as a reverse proxy to handle static files and route requests to the Node.js backend. This setup provides better performance and security.

### Nginx Configuration

The nginx configuration (`fe/default.conf`) includes:

```nginx
server {
    listen 7979;
    server_name _;

    # Serve static files (CSS, images, etc.) directly from nginx
    # Strategy: short max-age + revalidation (ETag/Last-Modified automatically set by nginx)
    location /static/ {
        alias /usr/share/nginx/html/;
        # Allow browsers to cache briefly but revalidate so changes propagate fast
        add_header Cache-Control "public, max-age=60, must-revalidate";
        # Optional: force no transform and indicate immutable only if hashed names later
        try_files $uri $uri/ =404;
    }

    # Keep API route for future API endpoints
    location /api/ {
        proxy_pass http://final-backend:4610/api/;
    }

    # Proxy all other requests to Node.js app (so Handlebars views can be rendered)
    location / {
        proxy_pass http://final-backend:4610;
    }
}
```

### Proxy Features

- **Static File Serving**: CSS and other static assets are served directly by nginx for better performance
- **Reverse Proxy**: All dynamic requests are forwarded to the Node.js backend
- **Caching Strategy**: Static files have a 60-second cache with revalidation
- **Future API Support**: Dedicated `/api/` route for potential REST API endpoints
- **Header Forwarding**: Proper client IP and protocol information passed to backend

### Docker Network Setup

The nginx and Node.js containers communicate through an internal Docker network:

- **Network Name**: `app-network`
- **Backend Service**: `final-backend:4610` (internal Docker hostname)
- **Frontend Service**: `final-nginx:7979` (exposed to host)

### External Access Configuration

For production deployment with a domain name and SSL:

1. **Domain Setup**: Point your domain to the server IP
2. **SSL Certificate**: Use Let's Encrypt or your certificate provider
3. **Nginx Proxy Manager**: Configure upstream to `localhost:7979`

### Troubleshooting

Common issues and solutions:

- **502 Bad Gateway**: Check if the Node.js container is running (`docker compose ps`)
- **Static files not loading**: Verify CSS files are in `fe/public/` directory
- **CORS issues**: Add appropriate headers to nginx configuration
- **Session problems**: Ensure cookies are properly forwarded between nginx and Node.js

## Email Service Configuration

The application uses Nodemailer with Gmail service for sending password reset emails. This setup provides secure email delivery for account recovery functionality.

### Email Configuration

The email service is configured in `be/config/email.js`:

```javascript
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});
```

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Gmail Configuration for Email Service
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password

# Application Configuration
NODE_ENV=production
PORT=4610
```

### Gmail App Password Setup

To use Gmail for sending emails, you need to set up an App Password:

1. **Enable 2-Factor Authentication**:
   - Go to your Google Account settings
   - Navigate to Security → 2-Step Verification
   - Enable 2FA for your account

2. **Generate App Password**:
   - Go to Security → App passwords
   - Select "Mail" as the app type
   - Choose "Other" for device type
   - Enter a custom name (e.g., "Forum App")
   - Copy the generated 16-character password

3. **Configure Environment Variables**:
   - Set `GMAIL_USER` to your Gmail address
   - Set `GMAIL_APP_PASSWORD` to the generated app password

### Password Reset Email Flow

The password reset functionality works as follows:

1. **Token Generation**: 
   - 32-byte secure random token created with `crypto.randomBytes()`
   - Token expires after 1 hour for security

2. **Email Sending**:
   - Reset link sent to user's registered email
   - Link contains the secure token for verification

3. **Token Validation**:
   - Token verified against database
   - Expiration time checked
   - Email address matched to token

### Email Templates

**Password Reset Email**:
```
Subject: Password Reset Request

You requested a password reset. Click the link below to reset your password:

[Reset Link]

If you did not request this, please ignore this email.
```

### Troubleshooting

Common issues and solutions:

- **Authentication Failed**: Ensure App Password is correctly generated and set
- **Less Secure Apps**: Gmail requires App Passwords, not regular passwords
- **Email Not Sending**: Check environment variables are properly loaded
- **Token Expired**: Tokens are only valid for 1 hour after generation
- **Missing .env File**: Ensure `.env` file is in project root and properly formatted

### Email Service Monitoring

The application logs email operations:

```javascript
// Successful email
console.log('Email sent: ' + info.messageId);

// Failed email
console.error('Error sending email:', error);
```

Monitor these logs to ensure email service is functioning properly.

## Security Features

The application implements comprehensive security measures to protect against common web vulnerabilities and attacks.

### Authentication Security

#### Password Security
- **Argon2 Hashing**: Uses Argon2id algorithm with robust configuration
  ```javascript
  memoryCost: 65536,    // 64 MB memory usage
  timeCost: 3,          // 3 iterations
  parallelism: 4        // 4 parallel threads
  ```
- **Strong Password Requirements**:
  - Minimum 8 characters
  - Must contain uppercase letter
  - Must contain lowercase letter
  - Must contain at least one digit
  - Must contain special character (!@#$%^&*(),.?":{}|<>)

#### Session Management
- **Secure Session Configuration**:
  - 24-hour session expiration
  - Session data stored in SQLite database
  - Session IDs tied to usernames with foreign key constraints
  - Automatic session cleanup on logout

#### Login Protection
- **Brute Force Prevention**:
  - Maximum 5 failed login attempts per IP/username combination
  - 15-minute lockout period after exceeding attempts
  - Real-time attempt tracking and feedback to users
  - Automatic cleanup of old login attempts (hourly)

### Input Validation & Sanitization

#### User Registration Validation
- **Username Rules**:
  - 3-20 characters length
  - Alphanumeric and underscore only
  - Uniqueness enforced
  - Cannot be same as display name

- **Email Validation**:
  - Format validation using regex
  - Uniqueness enforced in database
  - Required for password reset functionality

- **Display Name Rules**:
  - 2-50 characters length
  - Must be unique across all users
  - Cannot match username
  - Required field validation

#### Content Sanitization
- **Markdown Security**:
  - XSS prevention through DOMPurify sanitization
  - Whitelist approach for allowed HTML tags
  - Forbidden tags: `script`, `style`, `iframe`, `object`, `embed`, `form`, `input`
  - Forbidden attributes: `onload`, `onerror`, `onclick`, `onmouseover`, `style`
  - URL restriction to safe protocols only

- **Chat Message Sanitization**:
  - HTML tag removal from chat messages
  - Control character filtering
  - 500-character length limit
  - Real-time validation before database storage

### Database Security

#### SQL Injection Prevention
- **Prepared Statements**: All database queries use parameterized statements
- **Foreign Key Constraints**: Referential integrity enforced
- **Cascade Operations**: Proper cleanup on user deletion

#### Session Storage
- **Database-backed Sessions**: Sessions stored in SQLite with proper relations
- **Session Cleanup**: Automatic removal of expired sessions
- **Session Validation**: Server-side session verification for all protected routes

### Access Control

#### Authentication Middleware
- **Route Protection**: All sensitive routes require authentication
- **Session Verification**: Server-side validation of login status
- **Automatic Redirects**: Unauthenticated users redirected to login

#### Authorization Checks
```javascript
// Example of protected route
if (!req.session || !req.session.isLoggedIn) {
    return res.redirect("/login");
}
```

### Password Reset Security

#### Token-Based Reset
- **Cryptographically Secure Tokens**: 32-byte random tokens using `crypto.randomBytes()`
- **Short Expiration**: 1-hour token validity
- **Single-Use Tokens**: Tokens deleted after successful use
- **Email Verification**: Tokens tied to specific email addresses
- **Automatic Cleanup**: Expired tokens removed periodically

#### Reset Flow Security
1. User requests reset with email validation
2. Secure token generated and stored with expiration
3. Reset link sent via email with embedded token
4. Token validated against database and expiration time
5. Password reset only allowed with valid, non-expired token
6. Token immediately deleted after successful reset

### Communication Security

#### Socket.IO Security
- **Session Integration**: WebSocket connections validated against user sessions
- **User Authentication**: Connections rejected without valid login
- **Message Validation**: Real-time message length and content validation
- **HTML Sanitization**: Chat messages stripped of HTML content

#### Data Transmission
- **Input Encoding**: All user inputs properly encoded before database storage
- **Output Encoding**: Data escaped when displayed in templates
- **CSRF Protection**: Session-based protection against cross-site requests

### Security Headers & Configuration

#### Environment Security
- **Environment Variables**: Sensitive data (email credentials) stored in environment
- **Production Configuration**: Separate config for development/production
- **Secret Management**: Session secrets externalized from code

### Vulnerability Mitigation

#### Cross-Site Scripting (XSS)
- **Input Sanitization**: All user content sanitized before storage
- **Output Encoding**: Template engine automatically escapes output
- **Content Security**: Markdown rendered through secure pipeline
- **HTML Filtering**: Dangerous HTML elements completely blocked

#### Injection Attacks
- **SQL Injection**: Prevented through parameterized queries
- **Command Injection**: No system command execution from user input
- **Script Injection**: Comprehensive HTML and script sanitization

### Error Handling & Logging

#### Security Logging
- **Login Attempts**: All attempts logged with IP and timestamp
- **Failed Operations**: Security-relevant failures logged
- **Token Operations**: Password reset token lifecycle logged
- **Session Events**: Login/logout events tracked

#### Error Information Disclosure
- **Generic Error Messages**: Avoid revealing system information
- **Secure Defaults**: Fail securely when validation errors occur
- **Input Validation**: Comprehensive validation with user-friendly messages

## Chat API Documentation

The application provides a real-time chat system using Socket.IO for WebSocket communication. The chat API includes both HTTP endpoints for accessing the chat interface and Socket.IO events for real-time messaging.

### HTTP Endpoints

#### GET /chat
Access the chat interface page.

**Authentication**: Required (redirects to login if not authenticated)

**Response**: Renders the chat.hbs template with user's display name

```javascript
// Example route handler
router.get("/chat", (req, res) => {
    if (!req.session || !req.session.isLoggedIn) {
        return res.redirect("/login");
    }
    res.render("chat", { display_name: req.session.display_name });
});
```

### Socket.IO Events

The chat system uses Socket.IO for real-time bidirectional communication between clients and server.

#### Connection Requirements

**Authentication**: Valid user session required
- Connection validated against Express session
- Unauthenticated connections immediately rejected

**Connection Flow**:
1. Client establishes WebSocket connection
2. Server validates session information
3. If invalid: emits error and disconnects
4. If valid: establishes chat connection

```javascript
// Connection validation
if (!userName) {
    socket.emit('error', {message: "You need to be logged in"});
    socket.disconnect();
    return;
}
```

#### Client → Server Events

##### sendMessage
Send a new chat message to all connected users.

**Event Data**:
```javascript
{
    message: "string"    // Message content (required)
}
```

**Validation**:
- Message must not be empty after trimming
- Maximum length: 500 characters
- HTML tags and control characters removed

**Error Responses**:
```javascript
// Message too long
socket.emit('error', {message: "Message too long (max 500 characters)"});

// Empty message (silently ignored)
```

**Success Flow**:
1. Message validated and sanitized
2. Saved to database with user information
3. Broadcasted to all connected clients

#### Server → Client Events

##### connect
Fired when client successfully connects to chat server.

**Event Data**: None

**Client Action**: Update UI to show connected status

##### disconnect
Fired when client disconnects from chat server.

**Event Data**: None

**Client Action**: Update UI to show disconnected status

##### error
Sent when an error occurs during chat operations.

**Event Data**:
```javascript
{
    message: "string"    // Human-readable error message
}
```

**Common Errors**:
- `"You need to be logged in"` - Authentication required
- `"Message too long (max 500 characters)"` - Message exceeds length limit

##### chatMessage
Broadcasts new messages to all connected clients.

**Event Data**:
```javascript
{
    username: "string",        // Sender's username
    display_name: "string",    // Sender's display name
    message: "string",         // Sanitized message content
    name_color: "string",      // User's name color (hex code)
    created_at: "string"       // ISO timestamp
}
```

**Example**:
```javascript
{
    username: "john_doe",
    display_name: "John Doe",
    message: "Hello everyone!",
    name_color: "#FF5733",
    created_at: "2025-12-16T10:30:45.123Z"
}
```

### Database Operations

#### Save Chat Message
**Function**: `saveChatMessage(username, display_name, message, name_color)`

**Parameters**:
- `username` (string): User's unique username
- `display_name` (string): User's display name
- `message` (string): Sanitized message content
- `name_color` (string): User's name color preference

**Returns**: 
- Success: Database row ID of saved message
- Error: `null`

#### Retrieve Chat Messages
**Function**: `getChatMessages(limit = 50)`

**Parameters**:
- `limit` (number, optional): Maximum messages to retrieve (default: 50)

**Returns**:
- Success: Array of message objects in chronological order
- Error: Empty array `[]`

**Message Object**:
```javascript
{
    username: "string",
    display_name: "string", 
    message: "string",
    name_color: "string",
    created_at: "string"    // SQLite timestamp
}
```

### Security Considerations

#### Authentication
- All Socket.IO connections validated against Express sessions
- Unauthenticated users cannot send or receive messages
- Session information verified on each connection attempt

#### Message Sanitization
- HTML tags stripped using regex: `/<[^>]*>/g`
- Control characters removed: `/[\x00-\x1F\x7F]/g`
- Message length enforced (500 character maximum)

#### Rate Limiting
- Message length validation prevents spam
- Empty messages silently ignored
- Client-side validation provides immediate feedback

### Client Implementation Example

```javascript
// Connect to chat
const socket = io();

// Handle connection events
socket.on('connect', () => {
    console.log('Connected to chat');
});

socket.on('disconnect', () => {
    console.log('Disconnected from chat');
});

// Handle errors
socket.on('error', (error) => {
    alert('Error: ' + error.message);
});

// Handle incoming messages
socket.on('chatMessage', (data) => {
    displayMessage(data);
});

// Send message
function sendMessage(messageText) {
    socket.emit('sendMessage', {
        message: messageText
    });
}
```

## Bugs/Limitations

There are a few limitations that I have come across while testing the applciation.  It is important to know about these.

- **Session Storing With Login**: The sessions are being stored, however the user will not remain logged in upon a reset.  You will have to login each time you enter the server.
- **Password Reset Email**: Sometimes, the reset email can be sent to spam or straight to junk.  It is important to check there if the reset email is not immediately found.
- **Live Chat Acting Slow**: Every once in a while the chat will take a while to connect or sometimes not connect.  It pays to be patient and if it takes more than a couple minutes, reset the page.
- **Live Chat Duplicating Messages**: This seems to occur when the chat is slow.  Sometimes, messages will duplicate when being sent (however, it only stores one in the database).
- **Live Chat History**: There is no chat history for those who newly enter the chat.  Old messages will not be visible to new users.

## Notes: Security Decisions and Tradeoffs

This project was made to be far more secure compared to the first one.  It took advantage of using a database to store everything instead of in-memory arrays.
This actually allowed for more to be done with storing and made it a lot easier to gather data for things like the users, comments, and chat messages.  It
also allowed me to do things like implement the login attempts tracking and the password resetting tokens.  The chat messages and comments would be secured
from injections and attacks due to the security setup of the database and its queries using paramaters and built-in sqlite3 functionality for protection.  Then there
was upgrading the password security.  Using regular expressions, I was able to implement requirements for stronger passwords.  On top of this, I was able to utilize
Argon2 to create hashes for the password that were also stored in the database.  The email linking was also crucial, because now users could reset their passwords and
do it securely by having generated tokens that would be embedded in secure email links.  Some tradeoffs to these security measures however were things like the amount
of time it took to implement as well as how quickly it is to access the data.  The in-memory was simpler and easier to access whereas sql queries made it a little more
complicated.  However, I believe the security is well worth it.  There is also the issue with space.  As comments, users, chats, etc. are added to the database, most
of the data does not get removed upon the reset of the server unless manually done so in the database.  This means storage will continue to fill.  This does, however,
allow for more persistance of the server as a whole.  Overall, the tradeoffs from the security implementations are well worth it for the improved security of the server.
