import jwt from 'jsonwebtoken';

// Lee el token JWT del encabezado Authorization y deja el usuario en req.usuario
export default function requiereSesion(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sesión requerida' });

  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    // Si tu token guarda el id con otro nombre, agrégalo aquí
    const id = p.id ?? p.sub ?? p.usuario_id ?? p.userId;
    if (!id) throw new Error('Token sin id');
    req.usuario = { id, rol: p.rol };
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o vencida' });
  }
}
