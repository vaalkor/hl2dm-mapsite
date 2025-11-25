'use strict';

export const CONSTANTS = {
    NO_RATING_MIN_RATING_VALUE: -0.5,
    PAGE_SIZE: 50
}

export const IGNORE_LABELS = ['UT', 'Quake', 'MissingTextures', 'Incomplete', 'Indoors', 'Outdoors', 'HL1', 'NoTripmines'] // Labels to exclude from the filtering component

export var ALL_WEAPONS = [
    "357",
    "alyxgun",
    "annabelle",
    "ar2",
    "assaultrifle",
    "awp",
    "brickbat",
    "bugbait",
    "crossbow",
    "crowbar",
    "deagle",
    "flashbang",
    "frag",
    "gauss",
    "glock",
    "grenade",
    "hegrenade",
    "HEGrenade",
    "knife",
    "m249",
    "m4a1",
    "mac10",
    "p228",
    "physcannon",
    "physgun",
    "pistol",
    "pistol_45acp",
    "pistol_50ae",
    "pistol_9mm",
    "revolver",
    "rpg",
    "sawnoff",
    "shotgun",
    "slam",
    "slamer",
    "smg1",
    "smokegrenade",
    "sniperrifle",
    "stunstick",
    "submachinegun",
    "xm1014"
];

// These are the standard map weapon entities. I only want to allow filtering based on these. The non standard entities would just clog up the filtering UI.
export const FILTER_WEAPONS = [
    "357",
    "ar2",
    "crossbow",
    "frag",
    "rpg",
    "shotgun",
    "slam"
];

export const ROUTES = {
    ratingsTable: "/",
    submittersTable: "/submitters",
    mapDetailsModal: "/mapdetails"
}