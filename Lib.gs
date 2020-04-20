// Library for Automatically Send Confirmation Emails from Google Forms.
// https://github.com/zinadesign/google-forms-email-sender

function getInfo(params) {
  params.remainingDailyQuota = MailApp.getRemainingDailyQuota() - 1;
  var form = FormApp.getActiveForm();
  params.formURL = form.getPublishedUrl(); // Form URL
  params.formTitle = form.getTitle(); // Form header
  params.formEmail = Session.getEffectiveUser().getEmail(); // Form owner email
  var formResponses = form.getResponses(); // List of all entries in the form
  var lastResponse = formResponses[formResponses.length - 1]; // Select the last entry in the form
  params.itemResponses = lastResponse.getItemResponses(); // Get an array with questions and answers
  params.submitterEmail = lastResponse.getRespondentEmail(); // We will receive the sender's e-mail - if the email collection field is enabled
  return params;
}

function sendMail(params) {
  // If you need to send a letter to the user, but he did not leave an email, we leave
  if (params.mailType == "submitter" && params.submitterEmail == '') {
    return;
  }
  // Prepare the basic data
  if (params.to != '') {
    var to = params.to;
  } else {
    var to = params.formEmail;
  }
  var cc = params.cc;
  var bcc = params.bcc;
  var replyTo = params.replyTo;
  var name = params.name;
  // Let's adjust the settings depending on who we are sending the letter to
  if (params.mailType == "owner") { // letter to the form owner
    if (params.submitterEmail != '') {
      replyTo = params.submitterEmail;
    }
  } else if (params.mailType == "submitter") { // an email to the user who submitted the form
    to = params.submitterEmail;
    cc = bcc = '';
  }
  // Generate email Subject
  var subject = generateSubject(params.subject,params.GMT,params.dateFormat,params.remainingDailyQuota,params.formTitle);
  // Generate email Body from the template
  if (params.mailTemplate == undefined) {
    params.mailTemplate = HtmlService.createTemplateFromFile('TemplateDefault');
  }
  var htmlBody = generateHtmlBody(params.mailType,params.mailTemplate,to,params.submitterEmail,params.name,params.itemResponses,params.remainingDailyQuota,params.formTitle,params.formURL);
  // Send a letter
  MailApp.sendEmail({ to: to, cc: cc, bcc: bcc, replyTo: replyTo, name: name, subject: subject, htmlBody: htmlBody });
}

// Generate email Subject
function generateSubject(subject,GMT,dateFormat,remainingDailyQuota,formTitle) {
  if (subject == '') {
    var subject = formTitle;
  } else {
    var date = Utilities.formatDate(new Date(), GMT, dateFormat);
    var quotaNumber = 100 - remainingDailyQuota;
    subject = subject.replace('{{formTitle}}', formTitle);
    subject = subject.replace('{{date}}', date);
    subject = subject.replace('{{quotaNumber}}', quotaNumber);
  }
  return subject;
}

// Generate email Body from the template
function generateHtmlBody(mailType,template,to,submitterEmail,name,itemResponses,remainingDailyQuota,formTitle,formURL) {
  template.mailType = mailType;
  template.to = to;
  template.submitterEmail = submitterEmail;
  template.name = name;
  template.remainingDailyQuota = remainingDailyQuota;
  template.formTitle = formTitle;
  template.formURL = formURL;
  template.responsesTable = generateResponsesTable(itemResponses, submitterEmail); // user response in table format
  template.responsesList = generateResponsesList(itemResponses, submitterEmail); // user response in list format
  var htmlBody = template.evaluate().getContent();
  return htmlBody;
}

// List of questions and answers in Table format:
function generateResponsesTable(itemResponses, submitterEmail) {
  var responsesTable = '<table>\n';
  for (var t = 0; t < itemResponses.length; t++) {
    var responseTitle = itemResponses[t].getItem().getTitle();
    var responseText = itemResponses[t].getResponse().toString();
    if (responseText == '') { responseText = '—'; }
    responsesTable += ''
    + '<tr>\n'
    + '  <td><strong>' + responseTitle + '</strong></td>\n'
    + '  <td>' + responseText + '</td>\n'
    + '</tr>\n';
  };
  if (submitterEmail != undefined && submitterEmail != '') {
    responsesTable += ''
    + '<tr>\n'
    + '  <td><strong>Ваш E-mail</strong></td>\n'
    + '  <td>' + submitterEmail + '</td>\n'
    + '</tr>\n';
  }
  responsesTable += '</table>\n';
  return responsesTable;
}

// List of questions and answers in List format:
function generateResponsesList(itemResponses, submitterEmail) {
  var responsesList = '<ul>\n';
  for (var l = 0; l < itemResponses.length; l++) {
    responsesList += '  <li><strong>' + itemResponses[l].getItem().getTitle() + '</strong> — ' + itemResponses[l].getResponse().toString() + '</li>\n';
  };
  if (submitterEmail != undefined && submitterEmail != '') {
    responsesList += '  <li><strong>Ваш E-mail</strong> — ' + submitterEmail + '</li>\n';
  }
  responsesList += '</ul>\n';
  return responsesList;
}