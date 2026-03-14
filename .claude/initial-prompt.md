You are an experienced web application architect and full stack developer with experience in Next.js and firebase integrations. I want to create a local hockey league management, statistics tracking and game management application.

---

The application should have a league admin management dashboard interface. This interface is made for the application creator and the local hockey federation personnel to manage the app. These elevated users should be able to:
- configure general application settings
- create leagues
   - configure league details like the match intervals (e.g. four(4) 15 minute intervals)
- create tournaments
   - configure tournament details like the match intervals (e.g. two(2) 10 minute intervals)
- manage clubs (add, update, delete, archive)
  - manage and approve changes submitted for squads
- manage match officials (umpires, match table operators)
  - note: players at clubs can also be match officials.
- invite club admins
- enable/disable accounts
- configure the calendar or schedule
- draft articles for posting
- post articles for public viewing
- post articles for viewing by certain roles (e.g. match officials only, team admins and players only, all authenticated users, and any other permutation. This can be achieved with a multi-select dropdown of roles)
- other administrative activities

The application should have a match-official dashboard interface to manage the games. This interface is made for umpires and match table operators to keep track of their upcoming and ongoing matches. This includes:
- calendar view or schedule for upcoming matches
- The timer for the match to be controlled and updated in real time as the game progresses. Include the ability to track stoppages for specific reasons (e.g. short corner, injury time, other) and track the duration of each stoppage.
- An alarm or indication at the end of each interval
- The option within the interface to quickly track match statistics (e.g. goal scored at what time, by who and assisted by who). Where possible, Note: these actions should be intuitive and non-intrusive for the match official so that can accurately track time and keep the game running smoothly (example 1. allow details to be edited after the fact so that subsequent actions and activites can also be tracked without being blocked by a previous action. examples 2. keep the timer always visible while accepting input for other stats being tracked.)
- view articles posted for match-official viewing by the hockey federation

The application should also have a team admin management dashboard interface for managing things related to each club. This interface is made for club presidents, managers and other club officials. A team admin should be able to:
- upload a csv of player data to ingest content into the application
- create multiple teams with varying demographics (e.g. male under 21 team, female senior team, mixed over 40 team)
- set players statuses (e.g. active or inactive).
- submit squad updates for approval by the league admin
- submit the player roster for each match with player names and numbers
- review and submit agreement to the match card details captured by the match table operators after each match
- view articles posted for team admin viewing by the hockey federation

During a match, the team admin should be able to view ongoing match details and track certain statistics as well. examples:
- view the live updates by the match table operators in terms of time and player statistics
- substitutions (include which players are swapped and at what time)
- turn overs (which player)
- successful dribbles (which player)
- aireal throws (which player)
- and more

The application should also have a player view for players who belong to a club to be able to:
- update their profile (preferred position, contact details, demographic information, injury status, etc.) 
- view their status within the club
- view updates related to the club
- view articles posted for player viewing by the hockey federation

The application should have a non-authenticated user interface (that is also available to logged in users). This view is for the general public to follow along with hockey activities, get updates and track history for the different games, tournaments and clubs. It will drive engagement and encourage more fan support:
- view players' public details and stats overall and per game (minutes played, number of dribbles, goals, etc.)
- view calendar of events (upcoming matches, tournaments, etc.)
- view team stats
- view league table
- view articles posted for public viewing by the hockey federation

---

Ultrathink and Create a detailed plan, in a file called 'hockey-connect-plan.md', broken down into phases for implementing this system utilizing Next.js and building attractive UI interfaces for the end users:
- For email handling I want to integrate resend.
- For icons and styling i want to leverage lucide and tailwind
- Enforce mobile responsiveness
- For image storage i want to use firebase (club logos, user profile images, article header images)
- For writing articles i want to use an open source wysiwig editor
- For realtime data components (e.g. live match updates) i want to use firebase real time database
- For static data storage i want to use firebase
- For hosting the Next.js server i want to use cloudrun
- For Authentication i want to use Firebase authentication (anonymous, google and email/password)
- Create and enforce RBAC rules for accessing certain data, between roles, between users, between clubs, etc.

Notes:
- There should be a strong focus on user experience
- Be sure to apply industry standards and expand on the feature set in terms of metrics to be tracked, functionality to include for different users and considerations to be made for this kind of application.
- the intention is for this to be an engaging experience for all user types to assist with the growth and development of field hockey in the country.


- incorporate notification
- match interface to include a canvas represnetaion of the field with player positions and the ability to change formation and initiate substitutions visually.
- maintenance mode for site updates
- facilitate player transfers between clubs which maintaining history with previous club