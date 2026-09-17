from django.db.models import QuerySet, Q


class ProductQuerySet(QuerySet):
    def active(self):
        return self.filter(status=True, is_deleted=False)

    def in_stock(self):
        """Products that have at least one active, in-stock variant."""
        return self.filter(
            variants__stock__gt=0, variants__status=True, variants__is_deleted=False
        ).distinct()

    def by_category(self, category_identifier):
        if not category_identifier:
            return self

        from products.models import Category
        try:
            if str(category_identifier).isdigit():
                cat = Category.objects.get(pk=int(category_identifier))
            else:
                cat = Category.objects.get(slug=str(category_identifier))

            category_ids = [cat.pk]

            def collect_children(parent_cat):
                for child in parent_cat.subcategories.filter(status=True, is_deleted=False):
                    category_ids.append(child.pk)
                    collect_children(child)

            collect_children(cat)
            return self.filter(category_id__in=category_ids)
        except (Category.DoesNotExist, ValueError, TypeError):
            return self.filter(category_id=category_identifier)

    def by_brand(self, brand_id):
        return self.filter(brand_id=brand_id)

    def search(self, query: str):
        return self.filter(
            Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(brand__brand_name__icontains=query)
        )

    def price_range(self, min_price=None, max_price=None):
        qs = self
        if min_price is not None:
            qs = qs.filter(base_price__gte=min_price)
        if max_price is not None:
            qs = qs.filter(base_price__lte=max_price)
        return qs

    def with_relations(self):
        """Optimised fetch for list and detail views."""
        return self.select_related("category", "brand").prefetch_related(
            "images", "variants"
        )
