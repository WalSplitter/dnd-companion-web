/**
 * Whether the app runs as an Owlbear Rodeo extension, i.e. inside the iframe Owlbear opens for it.
 * Owlbear marks that frame with an `obrref` query parameter, which is also how its SDK finds the room.
 * Read once at startup: the router drops the query string on the first navigation.
 */
export const inOwlbear = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('obrref')
