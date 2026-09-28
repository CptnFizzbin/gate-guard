package com.cptnfizzbin.keycard.examples.vision.quickstart;

import com.cptnfizzbin.keycard.subject.SubjectCatalog;

public class AppSubjects {
    public static final SubjectCatalog catalog = new SubjectCatalog();

    public static ArticleSubject Article = catalog.set(new ArticleSubject("article"));
}
