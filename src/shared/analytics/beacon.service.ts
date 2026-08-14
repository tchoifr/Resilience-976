/* global fetch */

/**
 * Envoi « au fil de l'eau » vers le collecteur : on ne fait rien de la reponse,
 * mais on la lit quand meme.
 *
 * Une requete dont le corps n'est jamais consomme reste ouverte du point de vue
 * de Chrome : `loadingFinished` n'est jamais emis. Le navigateur n'en souffre
 * pas, mais tout ce qui attend un reseau au repos attend indefiniment — dont
 * Lighthouse, qui rendait ses 62 rapports avec « The page loaded too slowly to
 * finish within the time limit » et une trace de 45 s alors que la page etait
 * peinte en 225 ms.
 *
 * `keepalive` est conserve : il permet a l'envoi de survivre a la navigation
 * sortante, et la sonde a montre qu'il n'entrait pour rien dans le probleme.
 */
export function postBeacon(endpoint: string, payload: unknown): void {
  void fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    keepalive: true,
    body: JSON.stringify(payload),
  })
    .then((response) => response.arrayBuffer())
    .catch(() => undefined)
}
