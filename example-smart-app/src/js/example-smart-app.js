(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|85354-9',
                              'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4', 
                              'http://loinc.org|8310-5'
                          ]
                      }
                    }
                  });
         var ai = smart.patient.api.fetchAll({
                    type: 'AllergyIntolerance',
                    query: {
                      "clinical-status": 'active'
                    }
                  });
        
          var imm = smart.patient.api.fetchAll({
                    type: 'Immunization'
                  });

        $.when(pt, obv, ai, imm).fail(onError);

        $.when(pt, obv, ai, imm).done(function(patient, obv, ai, imm) {
          
          console.log(patient);
          console.log(obv);
          console.log(ai);
          console.log(imm);
          
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family;
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('85354-9'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('85354-9'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');
          var temperature = byCodes('8310-5');
          
          //Open the HTML tag for the table
          var ai_table = "<table><tr><th>Name</th><th>Criticality</th><th>Clinical Status</th></tr>";
          
          var ai_length = ai.length;
          
          //Go through the different AllergyInteolerance resources, and get the code.text.
          for (var i = 0; i < ai_length; i++){
              //Add in new row for each AllergyInteolerance.
              ai_table += "<tr>"
                + "<td>" + ai[i].code.text + "</td>" 
                + "<td>" + ai[i].criticality + "</td>" 
                + "<td>" + if(ai[i].clinicalStatus.text !== undefined) {
                              ai[i].clinicalStatus.text
                            } + "</td>" 
                + "</tr>";
          }
          
          //Close the HTML tag for the table
          ai_table += "</table>";
          
          //Open the HTML tag for the table
          var imm_table = "<table><tr><th>Vaccine</th><th>Status</th><th>Status Reason</th></tr>";
          
          var imm_length = imm.length;
          
          //Go through the different Immunization resources, and get the code.text.
          for (var i = 0; i < imm_length; i++){
              //Add in new row for each Immunization.
              imm_table += "<tr>"
                + "<td>" + imm[i].vaccineCode.text + "</td>" 
                + "<td>" + imm[i].status + "</td>" 
                + "<td>" + imm[i].statusReason.text + "</td>" 
                + "</tr>";
          }
          
          //Close the HTML tag for the table
          imm_table += "</table>";

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);
          p.temperature = getQuantityValueAndUnit(temperature[0]);

          p.ai = ai_table;
          p.imm = imm_table;

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
      temperature: {value: ''},
      ai: {value: ''},
      imm: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#temperature').html(p.temperature);
    $('#ai').html(p.ai);
    $('#imm').html(p.imm);
  };

})(window);
