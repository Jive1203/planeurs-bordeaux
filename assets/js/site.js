// Planeurs Bordeaux Montesquieu : comportements du site, sans dépendance.
(function () {
  'use strict';

  var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // En-tête : transparent sur le bandeau d'accueil, plein dès qu'on défile
  var entete = document.querySelector('.entete');
  var hero = document.querySelector('.hero, .tete-page-photo');
  if (entete && hero) {
    var majEntete = function () { entete.classList.toggle('pleine', window.scrollY > 40); };
    majEntete();
    window.addEventListener('scroll', majEntete, { passive: true });
  }

  // Menu sur téléphone
  var boutonMenu = document.querySelector('.menu-bouton');
  if (boutonMenu) {
    var basculerMenu = function (ouvert) {
      document.body.classList.toggle('menu-ouvert', ouvert);
      boutonMenu.setAttribute('aria-expanded', String(ouvert));
      boutonMenu.textContent = ouvert ? 'Fermer' : 'Menu';
    };
    boutonMenu.addEventListener('click', function () {
      basculerMenu(!document.body.classList.contains('menu-ouvert'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') basculerMenu(false);
    });
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { basculerMenu(false); });
    });
  }

  // Bandeau d'accueil : les six légendes de l'ancien diaporama
  var indexHero = document.querySelector('.hero-index');
  if (indexHero) {
    var images = Array.prototype.slice.call(document.querySelectorAll('.hero-images img'));
    var boutons = Array.prototype.slice.call(indexHero.querySelectorAll('ol button'));
    var pause = indexHero.querySelector('.hero-pause');
    var legende = document.querySelector('.hero-legende');
    var courant = 0;
    var minuteur = null;
    var enLecture = !mouvementReduit;

    var charger = function (image) {
      if (image.dataset.srcset) {
        image.srcset = image.dataset.srcset;
        delete image.dataset.srcset;
      }
    };

    var montrer = function (rang) {
      courant = (rang + images.length) % images.length;
      images.forEach(function (image, i) { image.classList.toggle('actif', i === courant); });
      boutons.forEach(function (bouton, i) {
        bouton.classList.toggle('actif', i === courant);
        if (i === courant) bouton.setAttribute('aria-current', 'true');
        else bouton.removeAttribute('aria-current');
      });
      if (legende) legende.textContent = boutons[courant].textContent;
      charger(images[(courant + 1) % images.length]);
    };

    var relancer = function () {
      clearTimeout(minuteur);
      indexHero.classList.remove('en-lecture');
      if (!enLecture) return;
      // Force le redémarrage de la barre de progression
      void indexHero.offsetWidth;
      indexHero.classList.add('en-lecture');
      minuteur = setTimeout(function () {
        montrer(courant + 1);
        relancer();
      }, 7000);
    };

    boutons.forEach(function (bouton, i) {
      bouton.addEventListener('click', function () {
        charger(images[i]);
        montrer(i);
        relancer();
      });
    });

    if (pause) {
      var majPause = function () {
        pause.textContent = enLecture ? '❚❚' : '▶';
        pause.setAttribute('aria-label', enLecture ? 'Mettre le défilement en pause' : 'Reprendre le défilement');
      };
      pause.addEventListener('click', function () {
        enLecture = !enLecture;
        majPause();
        relancer();
      });
      majPause();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearTimeout(minuteur);
      else relancer();
    });

    window.addEventListener('load', function () { charger(images[1]); });
    montrer(0);
    relancer();
  }

  // Apparition au défilement
  var apparitions = document.querySelectorAll('.apparait');
  if ('IntersectionObserver' in window && !mouvementReduit) {
    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          entree.target.classList.add('vu');
          observateur.unobserve(entree.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    apparitions.forEach(function (el) { observateur.observe(el); });
  } else {
    apparitions.forEach(function (el) { el.classList.add('vu'); });
  }

  // Galerie : défilement par flèches et visionneuse
  var galerie = document.querySelector('.galerie');
  if (galerie) {
    document.querySelectorAll('[data-galerie]').forEach(function (fleche) {
      fleche.addEventListener('click', function () {
        var sens = fleche.dataset.galerie === 'suivant' ? 1 : -1;
        galerie.scrollBy({ left: sens * galerie.clientWidth * .8, behavior: mouvementReduit ? 'auto' : 'smooth' });
      });
    });

    var visionneuse = document.querySelector('.visionneuse');
    var vignettes = Array.prototype.slice.call(galerie.querySelectorAll('button'));
    if (visionneuse && visionneuse.showModal) {
      var grande = visionneuse.querySelector('img');
      var credit = visionneuse.querySelector('[data-credit]');
      var rangVu = 0;
      var afficher = function (rang) {
        rangVu = (rang + vignettes.length) % vignettes.length;
        var vignette = vignettes[rangVu];
        var image = vignette.querySelector('img');
        grande.src = vignette.dataset.grande;
        grande.alt = image.alt;
        credit.textContent = vignette.parentNode.querySelector('figcaption').textContent;
      };
      vignettes.forEach(function (vignette, i) {
        vignette.addEventListener('click', function () {
          afficher(i);
          visionneuse.showModal();
        });
      });
      visionneuse.querySelector('[data-vision="fermer"]').addEventListener('click', function () { visionneuse.close(); });
      visionneuse.querySelector('[data-vision="suivant"]').addEventListener('click', function () { afficher(rangVu + 1); });
      visionneuse.querySelector('[data-vision="retour"]').addEventListener('click', function () { afficher(rangVu - 1); });
      visionneuse.addEventListener('click', function (e) { if (e.target === grande) visionneuse.close(); });
      visionneuse.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') afficher(rangVu + 1);
        if (e.key === 'ArrowLeft') afficher(rangVu - 1);
      });
    }
  }

  // Webcams : une nouvelle image toutes les 30 s, seulement si elle est à l'écran
  var webcams = document.querySelectorAll('[data-webcam]');
  if (webcams.length) {
    var actualiser = function (cadre) {
      if (document.hidden) return;
      var image = cadre.querySelector('img');
      var etat = cadre.querySelector('[data-heure]');
      var suivante = new Image();
      suivante.onload = function () {
        image.src = suivante.src;
        cadre.classList.remove('en-panne');
        cadre.classList.add('prete');
        if (etat) etat.textContent = 'Image de ' + new Date().toLocaleTimeString('fr-FR');
      };
      suivante.onerror = function () {
        cadre.classList.remove('prete');
        cadre.classList.add('en-panne');
        if (etat) etat.textContent = 'Caméra indisponible';
      };
      suivante.src = cadre.dataset.webcam + '&t=' + Date.now();
    };
    var demarrer = function (cadre) {
      actualiser(cadre);
      setInterval(function () { actualiser(cadre); }, 30000);
      document.addEventListener('visibilitychange', function () { actualiser(cadre); });
    };
    if ('IntersectionObserver' in window) {
      var guetteur = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (entree) {
          if (entree.isIntersecting) {
            guetteur.unobserve(entree.target);
            demarrer(entree.target);
          }
        });
      }, { rootMargin: '200px' });
      webcams.forEach(function (cadre) { guetteur.observe(cadre); });
    } else {
      webcams.forEach(demarrer);
    }
  }

  // Livestream : un seul service chargé à la fois, les autres à la demande
  var onglets = Array.prototype.slice.call(document.querySelectorAll('.onglets a'));
  if (onglets.length) {
    var cadreDirect = document.querySelector('.cadre-direct');
    var lienExterne = document.querySelector('[data-lien-externe]');
    var titres = {};
    var ouvrir = function (onglet, majAdresse) {
      onglets.forEach(function (o) {
        var actif = o === onglet;
        o.setAttribute('aria-selected', String(actif));
        o.tabIndex = actif ? 0 : -1;
      });
      var id = onglet.dataset.onglet;
      if (!titres[id]) {
        var cadre = document.createElement('iframe');
        cadre.src = onglet.href;
        cadre.title = onglet.textContent;
        cadreDirect.appendChild(cadre);
        titres[id] = cadre;
      }
      Object.keys(titres).forEach(function (cle) { titres[cle].classList.toggle('visible', cle === id); });
      if (lienExterne) lienExterne.href = onglet.href;
      if (majAdresse) history.replaceState(null, '', '#' + id);
    };
    onglets.forEach(function (onglet, i) {
      onglet.addEventListener('click', function (e) {
        e.preventDefault();
        ouvrir(onglet, true);
      });
      onglet.addEventListener('keydown', function (e) {
        var pas = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!pas) return;
        e.preventDefault();
        var voisin = onglets[(i + pas + onglets.length) % onglets.length];
        ouvrir(voisin, true);
        voisin.focus();
      });
    });
    var ouvrirDemande = function () {
      var demande = location.hash.slice(1);
      ouvrir(onglets.filter(function (o) { return o.dataset.onglet === demande; })[0] || onglets[0], false);
    };
    window.addEventListener('hashchange', ouvrirDemande);
    ouvrirDemande();
  }

  // Tarifs : la sous-navigation suit la lecture
  var liensTarifs = Array.prototype.slice.call(document.querySelectorAll('.sous-nav a'));
  if (liensTarifs.length && 'IntersectionObserver' in window) {
    var suivi = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        liensTarifs.forEach(function (lien) {
          if (lien.getAttribute('href') === '#' + entree.target.id) {
            lien.setAttribute('aria-current', 'true');
            if (lien.parentNode.parentNode.scrollWidth > lien.parentNode.parentNode.clientWidth) {
              lien.parentNode.parentNode.scrollLeft = lien.offsetLeft - 24;
            }
          } else {
            lien.removeAttribute('aria-current');
          }
        });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.tarif').forEach(function (section) { suivi.observe(section); });
  }
})();
