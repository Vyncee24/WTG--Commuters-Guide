/**
 * setup-database.js — Database Schema Setup + Route Seeding
 * Creates all tables and inserts the route data that was previously
 * hard-coded inside routes.js (ROUTE_DB) into MySQL.
 *
 * Run once before starting the server:
 *   node setup-database.js
 *
 * CHANGES FROM ORIGINAL:
 *  - routes table now has a `steps` JSON column to store step-by-step
 *    commute instructions (previously only existed in the client-side JS).
 *  - Seeds the 7 routes from the original ROUTE_DB into MySQL so the
 *    backend API returns real data instead of an empty table.
 */

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

/* ─── Route data seeded from the original routes.js ROUTE_DB ─────────── */
const SEED_ROUTES = [
  {
    route_id:      'cvsu-ccat_sm-tanza',
    from_location: 'CVSU CCAT',
    to_location:   'SM Tanza',
    duration:      '45–60 mins',
    fare:          '₱30–₱50',
    transport_type:'jeep',
    tags:          ['Cavite', 'Student Route'],
    steps: [
      {
        num:         1,
        title:       'Ride a Jeepney from CVSU CCAT',
        transport:   'jeep',
        instruction: 'Board a jeepney with the signboard "Naic / Tanza / SM Tanza" in front of CVSU CCAT Gate.',
        signboard:   'Look for: "Naic", "Tanza", or "SM Tanza"',
        alightAt:    'Ride until SM Tanza (Terminal)',
        fare:        '₱15–₱20',
        mapQuery:    'CVSU+CCAT+Naic+Cavite'
      },
      {
        num:         2,
        title:       'Arrive at SM Tanza',
        transport:   'walk',
        instruction: 'Get off at the SM Tanza terminal. SM Tanza mall entrance is just a short walk from the terminal.',
        signboard:   null,
        alightAt:    null,
        fare:        null,
        mapQuery:    'SM+Tanza+Cavite'
      }
    ]
  },
  {
    route_id:      'cvsu-ccat_cvsu-main',
    from_location: 'CVSU CCAT',
    to_location:   'CVSU Main',
    duration:      '30–45 mins',
    fare:          '₱20–₱35',
    transport_type:'jeep',
    tags:          ['Cavite', 'Student Route'],
    steps: [
      {
        num:         1,
        title:       'Ride a Jeepney towards Indang',
        transport:   'jeep',
        instruction: 'From CVSU CCAT gate, board a jeepney heading towards Indang or Trece Martires. Tell the driver you are going to CVSU Main Campus in Indang.',
        signboard:   'Look for: "Indang", "Trece" or "CVSU"',
        alightAt:    'Alight at Indang town center or CVSU Main gate',
        fare:        '₱15–₱25',
        mapQuery:    'CVSU+CCAT+Naic+Cavite'
      },
      {
        num:         2,
        title:       'Tricycle to CVSU Main Campus',
        transport:   'tricycle',
        instruction: 'From Indang town center, ride a tricycle going to CVSU Main Campus. You can also walk if you are close to the campus gate.',
        signboard:   null,
        alightAt:    'CVSU Main Campus Gate',
        fare:        '₱10–₱15',
        mapQuery:    'Cavite+State+University+Indang'
      }
    ]
  },
  {
    route_id:      'naic-main_sm-molino',
    from_location: 'Naic (Poblacion)',
    to_location:   'SM Molino',
    duration:      '60–90 mins',
    fare:          '₱40–₱60',
    transport_type:'jeep',
    tags:          ['Cavite', 'Bacoor'],
    steps: [
      {
        num:         1,
        title:       'Jeepney from Naic to Bacoor',
        transport:   'jeep',
        instruction: 'From Naic Poblacion, board a jeepney with signboard "Bacoor" or "Imus". Ride until Bacoor Rotonda.',
        signboard:   'Look for: "Bacoor", "Imus / Bacoor"',
        alightAt:    'Alight at Bacoor Rotonda',
        fare:        '₱20–₱30',
        mapQuery:    'Naic+Poblacion+Cavite'
      },
      {
        num:         2,
        title:       'Transfer: Jeep or Multicab to SM Molino',
        transport:   'jeep',
        instruction: 'At Bacoor Rotonda, transfer to a jeepney or multicab heading to SM Molino. Look for signboards "Molino" or "SM Molino".',
        signboard:   'Look for: "Molino", "SM City Bacoor"',
        alightAt:    'SM Molino / SM City Bacoor',
        fare:        '₱15–₱20',
        mapQuery:    'SM+Molino+Bacoor+Cavite'
      }
    ]
  },
  {
    route_id:      'imus-central_sm-dasma',
    from_location: 'Imus Central',
    to_location:   'SM Dasmarinas',
    duration:      '25–40 mins',
    fare:          '₱20–₱35',
    transport_type:'jeep',
    tags:          ['Cavite', 'Dasmarinas'],
    steps: [
      {
        num:         1,
        title:       'Jeepney from Imus to Dasmarinas',
        transport:   'jeep',
        instruction: 'From Imus Central Market terminal, board a jeepney with signboard "Dasmarinas" or "Sampaloc". Ride until the SM Dasmarinas terminal.',
        signboard:   'Look for: "Dasmarinas", "Sampaloc Dasma"',
        alightAt:    'SM Dasmarinas Terminal',
        fare:        '₱15–₱25',
        mapQuery:    'Imus+Central+Market+Cavite'
      },
      {
        num:         2,
        title:       'Walk to SM Dasmarinas',
        transport:   'walk',
        instruction: 'SM Dasmarinas is right at the terminal. Walk through the main entrance.',
        signboard:   null,
        alightAt:    null,
        fare:        null,
        mapQuery:    'SM+Dasmarinas+City'
      }
    ]
  },
  {
    route_id:      'tagaytay-rotonda_sm-sta-rosa',
    from_location: 'Tagaytay Rotonda',
    to_location:   'SM Santa Rosa',
    duration:      '50–70 mins',
    fare:          '₱40–₱60',
    transport_type:'bus',
    tags:          ['Tagaytay', 'Laguna'],
    steps: [
      {
        num:         1,
        title:       'Bus from Tagaytay to Sta. Rosa',
        transport:   'bus',
        instruction: 'At Tagaytay Rotonda, board a bus or UV Express going to Sta. Rosa or Alabang. Tell the driver you are heading to SM Sta. Rosa.',
        signboard:   'Look for: "Sta. Rosa", "Alabang", "Laguna"',
        alightAt:    'Sta. Rosa exit / SM Sta. Rosa area',
        fare:        '₱30–₱45',
        mapQuery:    'Tagaytay+Rotonda+Cavite'
      },
      {
        num:         2,
        title:       'Tricycle to SM Sta. Rosa',
        transport:   'tricycle',
        instruction: 'From the Sta. Rosa highway drop-off, ride a tricycle going to SM Santa Rosa.',
        signboard:   null,
        alightAt:    'SM Santa Rosa Laguna',
        fare:        '₱10–₱15',
        mapQuery:    'SM+Santa+Rosa+Laguna'
      }
    ]
  },
  {
    route_id:      'cvsu-main_trece-palengke',
    from_location: 'CVSU Main',
    to_location:   'Trece Martires Palengke',
    duration:      '20–35 mins',
    fare:          '₱15–₱25',
    transport_type:'tricycle',
    tags:          ['Cavite', 'Student Route'],
    steps: [
      {
        num:         1,
        title:       'Tricycle or Jeep to Indang Proper',
        transport:   'tricycle',
        instruction: 'From CVSU Main Campus, ride a tricycle or walk to Indang town center terminal.',
        signboard:   'Look for tricycles near the campus gate',
        alightAt:    'Indang Terminal',
        fare:        '₱10',
        mapQuery:    'Cavite+State+University+Indang'
      },
      {
        num:         2,
        title:       'Jeepney to Trece Martires',
        transport:   'jeep',
        instruction: 'From Indang terminal, board a jeepney with "Trece Martires" on the signboard. Ride until Trece Palengke (market).',
        signboard:   'Look for: "Trece Martires"',
        alightAt:    'Trece Martires Palengke / City Hall area',
        fare:        '₱10–₱15',
        mapQuery:    'Trece+Martires+City+Hall+Cavite'
      }
    ]
  },
  {
    route_id:      'mcdo-maple_freedom-park',
    from_location: 'McDonalds Maple Grove',
    to_location:   'Freedom Park',
    duration:      '1hr 30mins - 2hrs',
    fare:          '₱15–₱25',
    transport_type:'jeep',
    tags:          ['Cavite', 'Student Route'],
    steps: [
      {
        num:         1,
        title:       'Jeep to Freedom Park Kawit Cavite',
        transport:   'jeep',
        instruction: 'From McDonalds Maple Grove ride a jeepney with "potol kawit" and "Binakayan" on the signboard.',
        signboard:   'Look for: "Potol kawit" and "Binakayan"',
        alightAt:    'Freedom Park, Kawit, Cavite',
        fare:        '₱20',
        mapQuery:    'Aguinaldo+Freedom+Park'
      }
    ]
  }
];

/* ─── Main setup function ─────────────────────────────────────────────── */
async function setupDatabase() {
  // Connect without selecting a DB first so we can CREATE DATABASE
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    port:     process.env.DB_PORT     || 3306
  });

  try {
    console.log('📦 Setting up database…\n');

    const dbName = process.env.DB_NAME || 'wtg_commuters_guide';

    // 1. Create DB
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✓ Database '${dbName}' created / verified`);

    await connection.query(`USE \`${dbName}\``);

    // 2. users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(100)  NOT NULL,
        email      VARCHAR(100)  UNIQUE NOT NULL,
        password   VARCHAR(255)  NOT NULL,
        role       ENUM('user','admin') DEFAULT 'user',
        status     ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (email)
      )
    `);
    console.log('✓ users table created / verified');

    // 3. routes table
    //    NOTE: `steps` column stores the full step-by-step instructions as JSON.
    //    This column did NOT exist in the original schema — route step data
    //    was previously only inside the client-side routes.js ROUTE_DB array.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        route_id       VARCHAR(50)  UNIQUE NOT NULL,
        from_location  VARCHAR(100) NOT NULL,
        to_location    VARCHAR(100) NOT NULL,
        duration       VARCHAR(50),
        fare           VARCHAR(50),
        transport_type VARCHAR(50),
        tags           JSON,
        steps          JSON,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (from_location, to_location)
      )
    `);
    console.log('✓ routes table created / verified (with steps column)');

    // 4. saved_routes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS saved_routes (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        user_id       INT         NOT NULL,
        route_id      VARCHAR(50) NOT NULL,
        from_location VARCHAR(100) NOT NULL,
        to_location   VARCHAR(100) NOT NULL,
        saved_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (user_id),
        UNIQUE KEY unique_save (user_id, route_id)
      )
    `);
    console.log('✓ saved_routes table created / verified');

    // 5. comments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT  NOT NULL,
        route_id   VARCHAR(50) NOT NULL,
        comment    TEXT NOT NULL,
        rating     INT CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (route_id),
        INDEX (user_id)
      )
    `);
    console.log('✓ comments table created / verified');

    // 6. Seed route data
    //    INSERT IGNORE skips rows whose route_id already exists.
    console.log('\n📍 Seeding route data into MySQL…');
    let inserted = 0;
    for (const route of SEED_ROUTES) {
      const [result] = await connection.query(
        `INSERT IGNORE INTO routes
           (route_id, from_location, to_location, duration, fare,
            transport_type, tags, steps)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          route.route_id,
          route.from_location,
          route.to_location,
          route.duration       || null,
          route.fare           || null,
          route.transport_type || null,
          JSON.stringify(route.tags  || []),
          JSON.stringify(route.steps || [])
        ]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✓ Inserted: ${route.from_location} → ${route.to_location}`);
        inserted++;
      } else {
        console.log(`  – Skipped (already exists): ${route.route_id}`);
      }
    }
    console.log(`\n  ${inserted} route(s) inserted, ${SEED_ROUTES.length - inserted} already present.`);

    // 7. Default admin user
    const adminEmail = 'janvincentreyel24@gmail.com';
    const [existingAdmin] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );

    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash('janvincentreyel2406', 10);
      await connection.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin', adminEmail, hashedPassword, 'admin']
      );
      console.log('\n✓ Default admin user created');
    } else {
      console.log('\n✓ Admin user already exists');
    }

    console.log('\n✅ Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. npm install');
    console.log('  2. npm start   (or: npm run dev)');
  } catch (err) {
    console.error('\n❌ Database setup failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setupDatabase();
