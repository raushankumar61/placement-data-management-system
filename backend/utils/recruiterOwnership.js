const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();

const addIdentifier = (set, value) => {
  const normalized = normalizeIdentifier(value);
  if (normalized) set.add(normalized);
};

const collectRecruiterDocuments = async (db, user = {}) => {
  if (!db) return [];

  const documents = [];
  const seenIds = new Set();
  let uidMatchId = '';
  const tasks = [];

  const pushDoc = (docSnap) => {
    if (!docSnap?.exists || seenIds.has(docSnap.id)) return;
    seenIds.add(docSnap.id);
    documents.push({ id: docSnap.id, ...docSnap.data() });
  };

  if (user.uid) {
    tasks.push(
      db.collection('recruiters')
        .doc(user.uid)
        .get()
        .then((docSnap) => {
          if (docSnap?.exists) uidMatchId = docSnap.id;
          pushDoc(docSnap);
        }),
    );
  }

  if (user.email) {
    tasks.push(
      db.collection('recruiters')
        .where('contactEmail', '==', user.email)
        .limit(10)
        .get()
        .then((snap) => snap.docs.forEach(pushDoc)),
    );
  }

  if (user.name) {
    tasks.push(
      db.collection('recruiters')
        .where('companyName', '==', user.name)
        .limit(10)
        .get()
        .then((snap) => snap.docs.forEach(pushDoc)),
    );
  }

  await Promise.all(tasks);
  return { documents, uidMatchId };
};

const resolveRecruiterScope = async (db, user = {}) => {
  const identifiers = new Set();
  const { documents, uidMatchId } = await collectRecruiterDocuments(db, user);

  addIdentifier(identifiers, user.uid);
  addIdentifier(identifiers, user.email);
  addIdentifier(identifiers, user.name);

  documents.forEach((doc) => {
    addIdentifier(identifiers, doc.id);
    addIdentifier(identifiers, doc.contactEmail);
    addIdentifier(identifiers, doc.companyName);
  });

  const primaryRecruiterId = normalizeIdentifier(uidMatchId || documents[0]?.id || user.uid || '');

  return {
    primaryRecruiterId,
    recruiterIds: [...identifiers],
    recruiterDocs: documents,
  };
};

const isOwnedByRecruiter = (record, recruiterScope = {}) => {
  const allowed = new Set((recruiterScope.recruiterIds || []).map(normalizeIdentifier));
  if (!allowed.size) return false;

  return [
    record?.recruiterId,
    record?.postedBy,
    record?.postedByUid,
    record?.createdBy,
    record?.updatedBy,
  ].some((value) => allowed.has(normalizeIdentifier(value)));
};

module.exports = {
  isOwnedByRecruiter,
  normalizeIdentifier,
  resolveRecruiterScope,
};
