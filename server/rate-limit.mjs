// Derriere nginx, X-Real-IP est renseigne depuis $remote_addr et ecrase
// toute valeur envoyee par le client : c'est la seule adresse de la requete
// qui ne soit pas falsifiable. X-Forwarded-For, lui, commence par ce que le
// client a bien voulu declarer — s'y fier laissait n'importe qui repartir
// d'un compteur neuf en changeant l'en-tete a chaque appel.
export function getClientIp(request) {
  const realIp = request.headers['x-real-ip']

  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim()
  }

  return request.socket.remoteAddress ?? 'unknown'
}

// Fenetre glissante par cle, avec purge des cles expirees a chaque appel :
// sans elle la table grandit indefiniment au fil des visiteurs et devient
// elle-meme un moyen de saturer la memoire du serveur.
export function createRateLimiter({ limit, windowMs }) {
  const hitsByKey = new Map()

  return {
    allow(key, now = Date.now()) {
      const windowStart = now - windowMs

      for (const [candidate, timestamps] of hitsByKey) {
        const recent = timestamps.filter((timestamp) => timestamp > windowStart)

        if (recent.length === 0) {
          hitsByKey.delete(candidate)
        } else {
          hitsByKey.set(candidate, recent)
        }
      }

      const timestamps = hitsByKey.get(key) ?? []

      if (timestamps.length >= limit) {
        return false
      }

      timestamps.push(now)
      hitsByKey.set(key, timestamps)
      return true
    },

    size() {
      return hitsByKey.size
    },
  }
}
