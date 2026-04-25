/* ============================================================
   Curso DJI Matrice 4 Series - ENAE
   Lógica de evaluación examen final
   ============================================================ */

(function () {
  'use strict';

  // Selección de opciones en preguntas
  document.addEventListener('click', function (ev) {
    var li = ev.target.closest('.opciones li');
    if (!li) return;
    var ul = li.parentElement;
    if (ul.classList.contains('bloqueada')) return;
    Array.prototype.forEach.call(ul.querySelectorAll('li'), function (el) {
      el.classList.remove('seleccionada');
    });
    li.classList.add('seleccionada');
  });

  // Evaluación al hacer click en "Calificar"
  var btnCalificar = document.getElementById('btn-calificar');
  if (btnCalificar) {
    btnCalificar.addEventListener('click', function () {
      var preguntas = document.querySelectorAll('.pregunta');
      var total = preguntas.length;
      var correctas = 0;
      var sinResponder = 0;

      preguntas.forEach(function (preg) {
        var ul = preg.querySelector('.opciones');
        var seleccionada = ul.querySelector('li.seleccionada');
        var correctaIdx = parseInt(preg.getAttribute('data-correcta'), 10);
        var lis = ul.querySelectorAll('li');

        ul.classList.add('bloqueada');

        if (!seleccionada) {
          sinResponder++;
        } else {
          var idxSel = parseInt(seleccionada.getAttribute('data-opt'), 10);
          if (idxSel === correctaIdx) {
            correctas++;
            seleccionada.classList.remove('seleccionada');
            seleccionada.classList.add('correcta');
          } else {
            seleccionada.classList.remove('seleccionada');
            seleccionada.classList.add('incorrecta');
            // marcar la correcta
            lis.forEach(function (li) {
              if (parseInt(li.getAttribute('data-opt'), 10) === correctaIdx) {
                li.classList.add('correcta');
              }
            });
          }
        }
      });

      var porcentaje = Math.round((correctas / total) * 100);
      var aprobado = porcentaje >= 70;
      var box = document.getElementById('resultado-examen');
      if (box) {
        box.style.display = 'block';
        var clase = aprobado ? 'aprobado' : 'reprobado';
        var titulo = aprobado ? 'Aprobado' : 'No aprobado';
        box.innerHTML =
          '<h3>Resultado del examen</h3>' +
          '<div class="puntaje ' + clase + '">' + correctas + ' / ' + total + '</div>' +
          '<p style="font-size:18px;font-weight:600;color:' + (aprobado ? '#27ae60' : '#c0392b') + ';">' + titulo + ' — ' + porcentaje + '%</p>' +
          '<p style="margin-top:12px;color:#6b7c8c;">Sin responder: ' + sinResponder + '. Mínimo de aprobación: 70%.</p>' +
          '<div style="margin-top:18px;"><a href="#" class="btn" onclick="location.reload(); return false;">Reintentar</a> <a href="../index.html" class="btn acento" style="margin-left:8px;">Volver al curso</a></div>';
        box.scrollIntoView({behavior: 'smooth'});
      }
    });
  }

  // Botón aleatorizar
  var btnAleat = document.getElementById('btn-aleatorizar');
  if (btnAleat) {
    btnAleat.addEventListener('click', function () {
      var contenedor = document.getElementById('contenedor-preguntas');
      if (!contenedor) return;
      var preguntas = Array.prototype.slice.call(contenedor.querySelectorAll('.pregunta'));
      preguntas.sort(function () { return Math.random() - 0.5; });
      preguntas.forEach(function (p, idx) {
        p.querySelector('.num').textContent = String(idx + 1);
        contenedor.appendChild(p);
      });
    });
  }
})();
