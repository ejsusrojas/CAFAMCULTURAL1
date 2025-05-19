const express = require("express");
const path = require("path");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/index.css", express.static(path.join(__dirname, "public", "index.css")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


const rootConnConfig = {
  host: "localhost",
  user: "root",
  password: "Codigo20071204"
};

const rootConn = mysql.createConnection(rootConnConfig);


rootConn.on('error', (err) => {
  
  console.error("❌ Error en rootConn (evento 'error'):", err);
  
});

rootConn.connect(connectErr => {
  if (connectErr) {
    console.error("❌ Error al conectar a MySQL con rootConn:", connectErr);
    
    
    
  } else {
    console.log("✅ Conexión root establecida para operaciones iniciales.");
    rootConn.query(
      `CREATE DATABASE IF NOT EXISTS hotel_reservas
         CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;`,
      (queryErr) => {
        if (queryErr) {
          console.error("❌ Error creando BD:", queryErr);
          
          
        } else {
          console.log("✅ Base de datos 'hotel_reservas' lista o ya existente.");
        }

        
        if (queryErr && queryErr.fatal) {
          console.warn("⚠️ Conexión root ya cerrada debido a error fatal durante la creación de la BD. No se llamará a end().");
        } else {
          rootConn.end((endErr) => {
            if (endErr) {
              
              console.error("❌ Error cerrando rootConn:", endErr);
            } else {
              console.log("✅ Conexión root cerrada exitosamente.");
            }
          });
        }
      }
    );
  }
});



const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Codigo20071204",
  database: "hotel_reservas",
  waitForConnections: true,
  connectionLimit: 10
});

pool.query(
  `CREATE TABLE IF NOT EXISTS reservas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      atraccion_turistica VARCHAR(150) NOT NULL,
      correo_electronico VARCHAR(100) NOT NULL,
      fecha_reserva DATE NOT NULL,
      fecha_salida DATE NOT NULL,
      numero_personas INT NOT NULL,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,
  (err) => {
    if (err) console.error("❌ Error creando tabla 'reservas':", err);
    else console.log("✅ Tabla 'reservas' lista o ya existente.");
  }
);

app.get("/api/reservas", async (req, res) => {
  try {
    const [rows] = await pool
      .promise()
      .query(
        `SELECT 
           id,
           nombre,
           atraccion_turistica,
           correo_electronico,
           DATE_FORMAT(fecha_reserva, "%Y-%m-%d") AS fecha_reserva,
           DATE_FORMAT(fecha_salida,  "%Y-%m-%d") AS fecha_salida,
           numero_personas,
           DATE_FORMAT(fecha_creacion, "%Y-%m-%d %H:%i:%s") AS fecha_creacion
         FROM reservas
         ORDER BY fecha_creacion DESC`
      );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error al obtener reservas:", err);
    res.status(500).json({ message: "Error interno al listar reservas." });
  }
});

app.post("/api/reservas", async (req, res) => {
  const {
    nombre,
    atraccion_turistica,
    correo_electronico,
    fecha_reserva,
    fecha_salida,
    numero_personas
  } = req.body;

  if (
    !nombre ||
    !atraccion_turistica ||
    !correo_electronico ||
    !fecha_reserva ||
    !fecha_salida ||
    !numero_personas
  ) {
    return res.status(400).json({ message: "Todos los campos son obligatorios." });
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(fecha_reserva) || !dateRe.test(fecha_salida)) {
    return res.status(400).json({ message: "Formato de fecha debe ser YYYY-MM-DD." });
  }
  if (new Date(fecha_salida) <= new Date(fecha_reserva)) {
    return res
      .status(400)
      .json({ message: "La fecha de salida debe ser posterior a la de reserva." });
  }

  try {
    const [result] = await pool
      .promise()
      .execute(
        `INSERT INTO reservas
           (nombre, atraccion_turistica, correo_electronico,
            fecha_reserva, fecha_salida, numero_personas)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          nombre,
          atraccion_turistica,
          correo_electronico,
          fecha_reserva,
          fecha_salida,
          parseInt(numero_personas, 10)
        ]
      );
    res.status(201).json({ message: "Reserva creada.", id_reserva: result.insertId });
  } catch (err) {
    console.error("❌ Error al crear reserva:", err);
    res.status(500).json({ message: "Error interno al crear la reserva." });
  }
});

app.listen(port, () => {
  console.log(`🚀 Corriendo en http://localhost:${port}/`);
  console.log(`📋 GET  /api/reservas`);
  console.log(`📋 POST /api/reservas`);
});